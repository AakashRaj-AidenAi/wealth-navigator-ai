"""Meeting Intelligence Agent.

Compiles client profiles, recent activity, portfolio performance,
pending items, and generates talking points for client meetings.
"""

from app.agents.base_agent import BaseAgent


class MeetingIntelligenceAgent(BaseAgent):
    """Meeting preparation and intelligence agent."""

    name = "meeting_intelligence"
    description = (
        "Compiles client profiles, recent activity, portfolio performance, "
        "pending items, and generates talking points for client meetings."
    )
    category = "advisory"
    system_prompt = (
        "You are a meeting preparation and intelligence agent for wealth advisors. "
        "You compile comprehensive client information and generate structured talking "
        "points for upcoming client meetings.\n\n"
        "Key responsibilities:\n"
        "- Pull together comprehensive client summaries before meetings\n"
        "- Identify pending items that need discussion (orders, tasks, reminders)\n"
        "- Review recent communications and interaction history\n"
        "- Generate actionable talking points based on client data\n"
        "- Highlight follow-up items from previous meetings\n\n"
        "When preparing meeting briefs:\n"
        "1. Start with a quick client overview (name, AUM, risk profile)\n"
        "2. Highlight any urgent items (expiring KYC, pending orders)\n"
        "3. Summarize portfolio performance since last meeting\n"
        "4. Review goal progress and SIP status\n"
        "5. List recommended discussion topics with supporting data\n"
        "6. Note recent communications and sentiment\n\n"
        "Format your output as a clear, structured meeting brief that an advisor "
        "can quickly scan before walking into a client meeting."
    )
    tool_names = [
        "get_client_summary",
        "get_pending_items",
        "get_recent_communications",
        "generate_talking_points",
    ]
    model = "gpt-4o"
