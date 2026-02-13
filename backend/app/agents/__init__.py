"""AI Agent package for the wealth management platform.

Imports all tool modules to ensure they are registered with the global
tool registry, then exports all agent classes for convenient access.

Provides ``initialize_agents()`` to create and register every specialized
agent at application startup.
"""

# Import tool modules so @tool decorators run and register functions
import app.agents.tools.client_tools  # noqa: F401
import app.agents.tools.funding_tools  # noqa: F401
import app.agents.tools.portfolio_tools  # noqa: F401

# Core agent infrastructure
from app.agents.base_agent import AgentContext, AgentResponse, BaseAgent  # noqa: F401
from app.agents.registry import (  # noqa: F401
    get_agent,
    get_agent_names,
    get_all_agents,
    register_agent,
)
from app.agents.orchestrator import Orchestrator, get_orchestrator  # noqa: F401
from app.agents.memory import MemoryManager, get_memory_manager  # noqa: F401

# Import agent classes
from app.agents.advisor_agent import AdvisorAssistantAgent  # noqa: F401
from app.agents.cio_agent import CIOStrategyAgent  # noqa: F401
from app.agents.compliance_agent import ComplianceSentinelAgent  # noqa: F401
from app.agents.funding_agent import FundingRiskAgent  # noqa: F401
from app.agents.growth_agent import GrowthEngineAgent  # noqa: F401
from app.agents.meeting_agent import MeetingIntelligenceAgent  # noqa: F401
from app.agents.portfolio_agent import PortfolioIntelligenceAgent  # noqa: F401
from app.agents.tax_agent import TaxOptimizerAgent  # noqa: F401


def initialize_agents() -> None:
    """Create and register all specialized agents. Called at app startup."""
    agents = [
        PortfolioIntelligenceAgent(),
        CIOStrategyAgent(),
        AdvisorAssistantAgent(),
        ComplianceSentinelAgent(),
        TaxOptimizerAgent(),
        MeetingIntelligenceAgent(),
        GrowthEngineAgent(),
        FundingRiskAgent(),
    ]

    for agent in agents:
        register_agent(agent)


__all__ = [
    # Infrastructure
    "BaseAgent",
    "AgentContext",
    "AgentResponse",
    "register_agent",
    "get_agent",
    "get_all_agents",
    "get_agent_names",
    "Orchestrator",
    "get_orchestrator",
    "MemoryManager",
    "get_memory_manager",
    "initialize_agents",
    # Agent classes
    "AdvisorAssistantAgent",
    "CIOStrategyAgent",
    "ComplianceSentinelAgent",
    "FundingRiskAgent",
    "GrowthEngineAgent",
    "MeetingIntelligenceAgent",
    "PortfolioIntelligenceAgent",
    "TaxOptimizerAgent",
]
