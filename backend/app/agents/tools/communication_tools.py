"""Communication tools for AI agents.

Provides tool functions for drafting emails, querying communication history,
sending notifications, and creating campaign messages.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.communication import CommunicationLog
from app.models.campaign import CampaignMessageLog, CommunicationCampaign


# ---------------------------------------------------------------------------
# draft_email
# ---------------------------------------------------------------------------


@tool(
    name="draft_email",
    description=(
        "Draft a professional email for wealth management communication. "
        "Accepts recipient name, subject, context/body hint, and tone. "
        "Returns the drafted email text ready for review."
    ),
)
async def draft_email(
    recipient_name: str,
    subject: str,
    context: str,
    tone: str = "professional",
    db: AsyncSession = None,
) -> dict:
    """Draft an email based on provided context and tone.

    This generates a structured email template. In production, an LLM call
    would refine the content further. Here we return a well-structured draft.
    """
    tone_greeting = {
        "professional": "Dear",
        "friendly": "Hi",
        "formal": "Respected",
        "casual": "Hey",
    }
    greeting = tone_greeting.get(tone, "Dear")

    tone_closing = {
        "professional": "Best regards",
        "friendly": "Warm regards",
        "formal": "Yours sincerely",
        "casual": "Cheers",
    }
    closing = tone_closing.get(tone, "Best regards")

    body = (
        f"{greeting} {recipient_name},\n\n"
        f"{context}\n\n"
        f"Please do not hesitate to reach out if you have any questions or "
        f"would like to discuss this further.\n\n"
        f"{closing},\n"
        f"[Your Name]\n"
        f"Wealth Advisor"
    )

    return {
        "subject": subject,
        "recipient": recipient_name,
        "tone": tone,
        "body": body,
        "status": "draft",
        "message": "Email drafted successfully. Review before sending.",
    }


# ---------------------------------------------------------------------------
# get_communication_history
# ---------------------------------------------------------------------------


@tool(
    name="get_communication_history",
    description=(
        "Fetch recent communication history for a client including emails, "
        "calls, meetings, SMS, and WhatsApp messages. Returns up to "
        "``limit`` entries sorted by most recent."
    ),
)
async def get_communication_history(
    client_id: str,
    limit: int = 10,
    db: AsyncSession = None,
) -> list[dict]:
    """Return recent communication logs for a client."""
    result = await db.execute(
        select(CommunicationLog)
        .where(CommunicationLog.client_id == client_id)
        .order_by(CommunicationLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "communication_type": log.communication_type,
            "direction": log.direction,
            "subject": log.subject,
            "content": (
                (log.content[:200] + "...") if log.content and len(log.content) > 200
                else log.content
            ),
            "status": log.status,
            "delivered_at": str(log.delivered_at) if log.delivered_at else None,
            "opened_at": str(log.opened_at) if log.opened_at else None,
            "created_at": str(log.created_at),
        }
        for log in logs
    ]


# ---------------------------------------------------------------------------
# send_notification
# ---------------------------------------------------------------------------


@tool(
    name="send_notification",
    description=(
        "Send a notification to a user/advisor. Channel can be 'in_app', "
        "'email', or 'push'. Returns confirmation of the notification being queued."
    ),
)
async def send_notification(
    user_id: str,
    message: str,
    channel: str = "in_app",
    db: AsyncSession = None,
) -> dict:
    """Queue a notification for delivery.

    In production this would integrate with a notification service.
    For now we record it as a communication log entry.
    """
    log = CommunicationLog(
        id=uuid.uuid4(),
        advisor_id=user_id,
        communication_type=f"notification_{channel}",
        direction="outbound",
        subject="System Notification",
        content=message,
        status="sent",
    )
    db.add(log)
    await db.flush()

    return {
        "notification_id": str(log.id),
        "user_id": user_id,
        "channel": channel,
        "message": message,
        "status": "sent",
        "sent_at": str(datetime.now(timezone.utc)),
    }


# ---------------------------------------------------------------------------
# create_campaign_message
# ---------------------------------------------------------------------------


@tool(
    name="create_campaign_message",
    description=(
        "Create a campaign message for a specific campaign. Accepts campaign_id, "
        "template content, and optional variable substitutions. "
        "Returns the created message details."
    ),
)
async def create_campaign_message(
    campaign_id: str,
    template: str,
    variables: str = "",
    db: AsyncSession = None,
) -> dict:
    """Create a campaign message record.

    Args:
        campaign_id: ID of the campaign to attach the message to.
        template: The message template/content.
        variables: Comma-separated key=value pairs for variable substitution.
        db: Database session.
    """
    # Verify campaign exists
    campaign_result = await db.execute(
        select(CommunicationCampaign).where(CommunicationCampaign.id == campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    if not campaign:
        return {"error": f"Campaign {campaign_id} not found"}

    # Apply variable substitutions
    content = template
    if variables:
        for pair in variables.split(","):
            pair = pair.strip()
            if "=" in pair:
                key, value = pair.split("=", 1)
                content = content.replace(f"{{{{{key.strip()}}}}}", value.strip())

    # Update campaign content
    campaign.content = content
    await db.flush()

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.name,
        "content": content,
        "channel": campaign.channel,
        "status": campaign.status,
        "message": "Campaign message created successfully.",
    }
