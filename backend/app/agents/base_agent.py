"""Base agent class for all specialized wealth management agents."""
import json
import logging
from typing import Any, AsyncGenerator
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.openai_client import chat_completion, get_openai_client
from app.agents.tools import get_tool_definitions, execute_tool

logger = logging.getLogger(__name__)

@dataclass
class AgentContext:
    """Context passed to an agent for each interaction."""
    user_id: str
    advisor_id: str
    conversation_id: str | None = None
    session_messages: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

@dataclass
class AgentResponse:
    """Response from an agent execution."""
    content: str
    agent_name: str
    tool_calls_made: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    actions: list[dict] = field(default_factory=list)

class BaseAgent:
    """Base class for all specialized agents.

    Subclasses should override:
    - name: str
    - description: str
    - system_prompt: str
    - tool_names: list[str]
    - model: str (default "gpt-4o")
    """

    name: str = "base_agent"
    description: str = "Base agent"
    category: str = "advisory"
    system_prompt: str = "You are a helpful assistant."
    tool_names: list[str] = []
    model: str = "gpt-4o"
    temperature: float = 0.3
    max_tool_rounds: int = 5  # Max rounds of tool calling before forcing a text response

    async def run(
        self,
        message: str,
        context: AgentContext,
        db: AsyncSession,
    ) -> AgentResponse:
        """Execute the agent with the given message and context.

        Handles the full tool-calling loop:
        1. Send message to GPT with tool definitions
        2. If GPT returns tool calls, execute them and send results back
        3. Repeat until GPT returns a text response or max rounds reached
        """
        messages = self._build_messages(message, context)
        tools = get_tool_definitions(self.tool_names) if self.tool_names else None
        tool_calls_made = []

        for round_num in range(self.max_tool_rounds):
            response = await chat_completion(
                messages=messages,
                model=self.model,
                tools=tools,
                temperature=self.temperature,
            )

            choice = response.choices[0]

            # If the model wants to call tools
            if choice.message.tool_calls:
                messages.append(choice.message.model_dump())

                for tool_call in choice.message.tool_calls:
                    func_name = tool_call.function.name
                    func_args = tool_call.function.arguments

                    logger.info(f"[{self.name}] Calling tool: {func_name}")
                    tool_calls_made.append(func_name)

                    try:
                        result = await execute_tool(func_name, func_args, db=db)
                        result_str = json.dumps(result, default=str) if not isinstance(result, str) else result
                    except Exception as e:
                        logger.error(f"[{self.name}] Tool {func_name} failed: {e}")
                        result_str = json.dumps({"error": str(e)})

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_str,
                    })
            else:
                # Model returned a text response
                content = choice.message.content or ""
                return AgentResponse(
                    content=content,
                    agent_name=self.name,
                    tool_calls_made=tool_calls_made,
                    metadata={"model": self.model, "rounds": round_num + 1},
                )

        # If we exhausted tool rounds, force a final text response without tools
        response = await chat_completion(
            messages=messages,
            model=self.model,
            tools=None,
            temperature=self.temperature,
        )
        content = response.choices[0].message.content or ""
        return AgentResponse(
            content=content,
            agent_name=self.name,
            tool_calls_made=tool_calls_made,
            metadata={"model": self.model, "rounds": self.max_tool_rounds, "forced_completion": True},
        )

    async def run_stream(
        self,
        message: str,
        context: AgentContext,
        db: AsyncSession,
    ) -> AsyncGenerator[dict, None]:
        """Stream agent response tokens for real-time delivery.

        Yields dicts with keys: type, content, metadata
        """
        messages = self._build_messages(message, context)
        tools = get_tool_definitions(self.tool_names) if self.tool_names else None
        tool_calls_made = []

        for round_num in range(self.max_tool_rounds):
            # Non-streaming call if we might need tool calls
            if tools and round_num < self.max_tool_rounds - 1:
                response = await chat_completion(
                    messages=messages,
                    model=self.model,
                    tools=tools,
                    temperature=self.temperature,
                )
                choice = response.choices[0]

                if choice.message.tool_calls:
                    messages.append(choice.message.model_dump())

                    for tool_call in choice.message.tool_calls:
                        func_name = tool_call.function.name
                        func_args = tool_call.function.arguments
                        tool_calls_made.append(func_name)

                        yield {"type": "agent_status", "status": "tool_call", "agent": self.name, "message": f"Using {func_name}..."}

                        try:
                            result = await execute_tool(func_name, func_args, db=db)
                            result_str = json.dumps(result, default=str) if not isinstance(result, str) else result
                        except Exception as e:
                            result_str = json.dumps({"error": str(e)})

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result_str,
                        })
                    continue
                else:
                    # Model returned text, now stream it
                    content = choice.message.content or ""
                    for char in content:
                        yield {"type": "stream_token", "token": char}
                    yield {"type": "stream_end", "content": content, "agent": self.name, "tool_calls": tool_calls_made}
                    return

            # Final round or no tools: stream directly
            client = get_openai_client()
            stream = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                stream=True,
            )

            full_content = ""
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_content += token
                    yield {"type": "stream_token", "token": token}

            yield {"type": "stream_end", "content": full_content, "agent": self.name, "tool_calls": tool_calls_made}
            return

    def _build_messages(self, message: str, context: AgentContext) -> list[dict]:
        """Build the message list for the OpenAI API call."""
        messages = [{"role": "system", "content": self.system_prompt}]

        # Add conversation history from context
        if context.session_messages:
            messages.extend(context.session_messages)

        # Add the current user message
        messages.append({"role": "user", "content": message})

        return messages

    async def delegate(self, agent_name: str, sub_query: str, context: AgentContext, db: AsyncSession) -> str:
        """Delegate a sub-task to another agent. Used for inter-agent delegation."""
        from app.agents.registry import get_agent

        other_agent = get_agent(agent_name)
        if other_agent is None:
            return f"Error: Agent '{agent_name}' not found"

        response = await other_agent.run(sub_query, context, db)
        return response.content
