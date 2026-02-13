"""Agent memory manager: short-term session + long-term PostgreSQL storage."""
import logging
import uuid
from typing import Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Conversation, ConversationSummary, Message
from app.utils.openai_client import chat_completion

logger = logging.getLogger(__name__)

# Maximum messages to keep in short-term context before summarizing
MAX_SHORT_TERM_MESSAGES = 20
# Target token count for context window (leave room for system prompt + response)
MAX_CONTEXT_TOKENS = 6000
# Approximate tokens per message
APPROX_TOKENS_PER_MESSAGE = 50


class MemoryManager:
    """Manages conversation memory with short-term and long-term storage."""

    async def get_conversation_context(
        self,
        conversation_id: str,
        db: AsyncSession,
        max_messages: int = MAX_SHORT_TERM_MESSAGES,
    ) -> list[dict]:
        """Retrieve recent messages for conversation context.

        Returns messages formatted for OpenAI API.
        """
        # Get recent messages from DB
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == uuid.UUID(conversation_id))
            .order_by(desc(Message.created_at))
            .limit(max_messages)
        )
        messages = result.scalars().all()
        messages.reverse()  # Chronological order

        # Convert to OpenAI message format
        context = []
        for msg in messages:
            entry = {"role": msg.role, "content": msg.content}
            context.append(entry)

        # If we have a long-term summary, prepend it
        summary = await self._get_latest_summary(conversation_id, db)
        if summary:
            context.insert(
                0,
                {
                    "role": "system",
                    "content": (
                        f"[Conversation summary up to this point: {summary}]"
                    ),
                },
            )

        return context

    async def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        db: AsyncSession,
        metadata: dict | None = None,
    ) -> Message:
        """Persist a message to the database."""
        message = Message(
            id=uuid.uuid4(),
            conversation_id=uuid.UUID(conversation_id),
            role=role,
            content=content,
            metadata=metadata or {},
        )
        db.add(message)
        await db.flush()
        return message

    async def create_conversation(
        self,
        user_id: str,
        db: AsyncSession,
        title: str = "New Conversation",
        agent_type: str | None = None,
    ) -> Conversation:
        """Create a new conversation."""
        convo = Conversation(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            title=title,
            agent_type=agent_type,
        )
        db.add(convo)
        await db.flush()
        return convo

    async def should_summarize(
        self,
        conversation_id: str,
        db: AsyncSession,
    ) -> bool:
        """Check if the conversation needs summarization."""
        result = await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == uuid.UUID(conversation_id)
            )
        )
        count = result.scalar() or 0
        return count > MAX_SHORT_TERM_MESSAGES * 2

    async def summarize_conversation(
        self,
        conversation_id: str,
        db: AsyncSession,
    ) -> str:
        """Generate a summary of the conversation and store it."""
        # Get all messages not yet summarized
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == uuid.UUID(conversation_id))
            .order_by(Message.created_at)
            .limit(MAX_SHORT_TERM_MESSAGES * 2)
        )
        messages = result.scalars().all()

        if not messages:
            return ""

        # Build text for summarization
        text = "\n".join(f"{m.role}: {m.content}" for m in messages)

        summary_response = await chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a conversation summarizer for a wealth "
                        "management platform. Summarize the following "
                        "conversation, preserving key facts about clients, "
                        "portfolios, decisions made, and action items. Be "
                        "concise but complete."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Summarize this conversation:\n\n{text}",
                },
            ],
            model="gpt-4o-mini",
            temperature=0.2,
            max_tokens=500,
        )

        summary_text = summary_response.choices[0].message.content

        # Store summary
        summary = ConversationSummary(
            id=uuid.uuid4(),
            conversation_id=uuid.UUID(conversation_id),
            summary=summary_text,
            key_entities={},
        )
        db.add(summary)
        await db.flush()

        logger.info(f"Created summary for conversation {conversation_id}")
        return summary_text

    async def _get_latest_summary(
        self,
        conversation_id: str,
        db: AsyncSession,
    ) -> Optional[str]:
        """Get the most recent conversation summary."""
        result = await db.execute(
            select(ConversationSummary)
            .where(
                ConversationSummary.conversation_id
                == uuid.UUID(conversation_id)
            )
            .order_by(desc(ConversationSummary.created_at))
            .limit(1)
        )
        summary = result.scalar_one_or_none()
        return summary.summary if summary else None


# Singleton
_memory_manager: MemoryManager | None = None


def get_memory_manager() -> MemoryManager:
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager
