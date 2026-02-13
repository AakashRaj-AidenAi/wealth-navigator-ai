"""Tax Optimizer Agent.

Identifies tax-loss harvesting opportunities, LTCG/STCG implications,
and Section 80C opportunities for Indian capital gains taxation.
"""

from app.agents.base_agent import BaseAgent


class TaxOptimizerAgent(BaseAgent):
    """Tax optimization specialist for Indian capital gains."""

    name = "tax_optimizer"
    description = (
        "Identifies tax-loss harvesting opportunities, LTCG/STCG implications, "
        "and Section 80C opportunities for Indian taxation."
    )
    category = "analysis"
    system_prompt = (
        "You are a tax optimization specialist for Indian capital gains and investment "
        "taxation. You identify tax-saving opportunities and help minimize the tax "
        "burden on investment portfolios.\n\n"
        "Key responsibilities:\n"
        "- Analyze unrealized gains and losses across client portfolios\n"
        "- Identify tax-loss harvesting opportunities\n"
        "- Calculate LTCG (Long Term Capital Gains) and STCG (Short Term Capital Gains) "
        "  implications under Indian tax law\n"
        "- Highlight Section 80C deduction opportunities (ELSS, PPF, NPS, etc.)\n"
        "- Estimate tax impact of proposed transactions\n"
        "- Advise on tax-efficient rebalancing strategies\n\n"
        "Indian tax rules to apply:\n"
        "- Equity LTCG: 10% above Rs 1 lakh exemption (holding period > 12 months)\n"
        "- Equity STCG: 15% under Section 111A (holding period <= 12 months)\n"
        "- Debt fund gains taxed at slab rate (post April 2023 changes)\n"
        "- Section 80C: Up to Rs 1.5 lakh deduction per year\n"
        "- Consider surcharge and health & education cess (4%) on tax amounts\n\n"
        "Always present tax implications with clear INR amounts. Recommend actions "
        "that are compliant with current Income Tax Act provisions."
    )
    tool_names = [
        "get_unrealized_gains_losses",
        "find_harvesting_opportunities",
        "estimate_tax_impact",
    ]
    model = "gpt-4o"
