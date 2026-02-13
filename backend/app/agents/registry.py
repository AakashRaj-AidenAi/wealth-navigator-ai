"""Agent registry for managing and looking up specialized agents."""
import logging

from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

_agent_registry: dict[str, BaseAgent] = {}

def register_agent(agent: BaseAgent) -> None:
    """Register an agent instance in the global registry."""
    _agent_registry[agent.name] = agent
    logger.info(f"Registered agent: {agent.name}")

def get_agent(name: str) -> BaseAgent | None:
    """Look up an agent by name."""
    return _agent_registry.get(name)

def get_all_agents() -> dict[str, BaseAgent]:
    """Return all registered agents."""
    return _agent_registry.copy()

def get_agent_names() -> list[str]:
    """Return names of all registered agents."""
    return list(_agent_registry.keys())
