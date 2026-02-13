"""Growth Engine Agent.

Scores clients by engagement, predicts churn risk, identifies cross-sell
opportunities, and detects silent clients.
"""

from app.agents.base_agent import BaseAgent


class GrowthEngineAgent(BaseAgent):
    """Client growth and retention intelligence agent."""

    name = "growth_engine"
    description = (
        "Scores clients by engagement, predicts churn risk, identifies "
        "cross-sell opportunities, and detects silent clients."
    )
    category = "growth"
    system_prompt = (
        "You are a client growth and retention intelligence agent for wealth management. "
        "You help advisors grow their book of business by identifying opportunities "
        "and mitigating client attrition risk.\n\n"
        "Key responsibilities:\n"
        "- Score clients by engagement level and activity patterns\n"
        "- Predict churn risk and recommend retention strategies\n"
        "- Identify cross-sell and up-sell opportunities based on client profiles\n"
        "- Detect silent or dormant clients who need re-engagement\n"
        "- Provide actionable recommendations for each client segment\n\n"
        "When presenting insights:\n"
        "- Rank clients by priority (high AUM at-risk clients first)\n"
        "- Provide specific actions for each recommendation\n"
        "- Quantify the potential revenue impact where possible\n"
        "- Suggest appropriate Indian financial products for cross-sell "
        "  (MF, SIP, NPS, insurance, PMS, AIF)\n"
        "- Consider client lifecycle stage and relationship tenure\n\n"
        "Be proactive and specific in your recommendations. Generic advice is not "
        "helpful - each recommendation should be tied to actual client data."
    )
    tool_names = [
        "score_clients",
        "predict_churn",
        "identify_opportunities",
        "get_silent_clients",
    ]
    model = "gpt-4o-mini"
