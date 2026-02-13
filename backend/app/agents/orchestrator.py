"""Agent orchestrator/supervisor that routes messages to appropriate agents."""
import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base_agent import AgentContext, AgentResponse
from app.agents.registry import get_agent, get_all_agents

logger = logging.getLogger(__name__)

# Intent to agent mapping
INTENT_AGENT_MAP = {
    "portfolio_analysis": "portfolio_intelligence",
    "risk_assessment": "portfolio_intelligence",
    "rebalance_request": "portfolio_intelligence",
    "client_lookup": "advisor_assistant",
    "general_chat": "advisor_assistant",
    "meeting_prep": "meeting_intelligence",
    "compliance_check": "compliance_sentinel",
    "tax_optimization": "tax_optimizer",
    "funding_analysis": "funding_risk",
    "order_management": "advisor_assistant",
    "lead_management": "growth_engine",
    "campaign_creation": "growth_engine",
    "churn_prediction": "growth_engine",
    "report_generation": "report_analytics",
    # Task management
    "task_management": "task_workflow",
    "task_creation": "task_workflow",
    # Analytics & reporting
    "analytics_query": "report_analytics",
    # Communications
    "communication_draft": "communications",
    "email_request": "communications",
    # Goal planning
    "goal_tracking": "goal_planning",
    "financial_planning": "goal_planning",
    # Client onboarding
    "client_onboarding": "onboarding",
    "document_collection": "onboarding",
}


@dataclass
class OrchestratorResult:
    """Result from orchestrator processing."""

    primary_response: AgentResponse
    delegated_responses: list[AgentResponse]
    nlp_result: dict | None = None


class Orchestrator:
    """Routes user messages to the appropriate specialized agent(s)."""

    def __init__(self):
        self.default_agent = "advisor_assistant"

    def select_agent(self, intent: str) -> str:
        """Select the best agent based on NLP intent classification."""
        return INTENT_AGENT_MAP.get(intent, self.default_agent)

    async def process(
        self,
        message: str,
        context: AgentContext,
        db: AsyncSession,
        nlp_result: dict | None = None,
    ) -> OrchestratorResult:
        """Process a user message through the appropriate agent.

        Args:
            message: The user's message
            context: Agent context with user/advisor/conversation info
            db: Database session
            nlp_result: Pre-computed NLP analysis (intent, entities, sentiment)
        """
        # Determine which agent to route to
        intent = "general_chat"
        if nlp_result and "intent" in nlp_result:
            intent = nlp_result["intent"].get("name", "general_chat")
            confidence = nlp_result["intent"].get("confidence", 0.0)

            # Fall back to default if confidence is too low
            if confidence < 0.4:
                intent = "general_chat"

        agent_name = self.select_agent(intent)
        agent = get_agent(agent_name)

        if agent is None:
            logger.warning(
                f"Agent '{agent_name}' not found, falling back to default"
            )
            agent = get_agent(self.default_agent)
            if agent is None:
                raise RuntimeError(
                    "No agents registered. Initialize agents first."
                )

        # Enrich context with NLP results
        if nlp_result:
            context.metadata["nlp_result"] = nlp_result
            context.metadata["intent"] = intent

            # If entities extracted, add to context for agent awareness
            if "entities" in nlp_result:
                context.metadata["entities"] = nlp_result["entities"]

        logger.info(f"Routing to agent '{agent.name}' for intent '{intent}'")

        # Execute the primary agent
        primary_response = await agent.run(message, context, db)

        return OrchestratorResult(
            primary_response=primary_response,
            delegated_responses=[],
            nlp_result=nlp_result,
        )

    async def process_stream(
        self,
        message: str,
        context: AgentContext,
        db: AsyncSession,
        nlp_result: dict | None = None,
    ):
        """Process and stream response from the appropriate agent.

        Yields dicts with type/content/metadata for SSE/WebSocket delivery.
        """
        # Check if a specific agent was requested by the frontend
        forced_agent = context.metadata.get("forced_agent")
        if forced_agent:
            agent_name = forced_agent
            intent = forced_agent
        else:
            intent = "general_chat"
            if nlp_result and "intent" in nlp_result:
                intent = nlp_result["intent"].get("name", "general_chat")
                confidence = nlp_result["intent"].get("confidence", 0.0)
                if confidence < 0.4:
                    intent = "general_chat"
            agent_name = self.select_agent(intent)

        agent = get_agent(agent_name)

        if agent is None:
            agent = get_agent(self.default_agent)
            if agent is None:
                yield {
                    "type": "error",
                    "message": "No agents available",
                }
                return

        if nlp_result:
            context.metadata["nlp_result"] = nlp_result
            context.metadata["intent"] = intent
            if "entities" in nlp_result:
                context.metadata["entities"] = nlp_result["entities"]

        yield {
            "type": "agent_status",
            "status": "thinking",
            "agent": agent.name,
            "message": f"{agent.name} is analyzing your request...",
        }

        async for event in agent.run_stream(message, context, db):
            yield event

    def get_agent_info(self) -> list[dict]:
        """Return info about all registered agents for the frontend."""
        agents = get_all_agents()
        return [
            {
                "name": agent.name,
                "description": agent.description,
                "category": getattr(agent, "category", "advisory"),
            }
            for agent in agents.values()
        ]


# Singleton orchestrator
_orchestrator: Orchestrator | None = None


def get_orchestrator() -> Orchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator
