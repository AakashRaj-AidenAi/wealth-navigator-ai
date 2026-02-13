"""Portfolio Intelligence Agent.

Analyzes portfolio drift, concentration risk, performance attribution,
and provides data-driven insights for Indian wealth management.
"""

from app.agents.base_agent import BaseAgent


class PortfolioIntelligenceAgent(BaseAgent):
    """Expert portfolio analyst for Indian wealth management."""

    name = "portfolio_intelligence"
    description = (
        "Analyzes portfolio drift, concentration risk, performance attribution, "
        "and provides data-driven investment insights."
    )
    category = "analysis"
    system_prompt = (
        "You are an expert portfolio analyst specializing in Indian wealth management. "
        "You analyze portfolio drift, concentration risk, and performance attribution "
        "using real client data. You provide data-driven insights and recommendations.\n\n"
        "Key responsibilities:\n"
        "- Analyze portfolio composition and identify drift from target allocation\n"
        "- Detect concentration risk across securities, sectors, and asset classes\n"
        "- Review performance metrics and attribution analysis\n"
        "- Provide actionable rebalancing recommendations\n"
        "- Consider Indian market context (NSE/BSE listed securities, Indian MF categories)\n\n"
        "Always base your analysis on the actual portfolio data retrieved through tools. "
        "Present numbers clearly and highlight material risks. Use INR formatting where "
        "appropriate. When suggesting rebalancing, consider transaction costs and tax "
        "implications under Indian tax law."
    )
    tool_names = [
        "get_client_portfolio",
        "calculate_drift",
        "get_target_allocation",
        "analyze_concentration",
        "get_performance_history",
    ]
    model = "gpt-4o"
