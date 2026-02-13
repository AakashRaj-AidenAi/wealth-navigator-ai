"""Knowledge graph query tools for AI agents.

Provides a tool for querying the Neo4j knowledge graph to retrieve
entity relationships, neighbor lookups, and user context enrichment.
"""

from __future__ import annotations

import logging

from app.agents.tools import tool
from app.services.knowledge_graph import get_knowledge_graph_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# query_knowledge_graph
# ---------------------------------------------------------------------------


@tool(
    name="query_knowledge_graph",
    description=(
        "Query the knowledge graph for entity relationships and context. "
        "If entity_id is provided, returns neighbors of that entity up to "
        "the specified depth. If only user_id is provided, returns the "
        "user's overall graph context (clients, tasks, alerts)."
    ),
)
async def query_knowledge_graph(
    user_id: str,
    entity_type: str = "all",
    entity_id: str = "",
    query: str = "",
    depth: int = 1,
) -> dict:
    """Query the knowledge graph for relationships and context.

    Args:
        user_id: The ID of the current user/advisor.
        entity_type: Type of entity to query (e.g. Client, Task, Alert, all).
        entity_id: Specific entity ID to look up neighbors for.
        query: Optional free-text query hint (reserved for future semantic search).
        depth: Number of relationship hops for neighbor queries (default 1).

    Returns:
        Dict with graph results -- neighbors list or user context summary.
    """
    kg = get_knowledge_graph_service()

    try:
        if entity_id:
            # Look up neighbors of a specific entity
            label = entity_type if entity_type and entity_type != "all" else "Entity"
            neighbors = await kg.query_neighbors(
                node_label=label,
                node_id=entity_id,
                depth=depth,
            )
            return {
                "entity_type": label,
                "entity_id": entity_id,
                "depth": depth,
                "neighbors": neighbors,
                "count": len(neighbors),
            }
        else:
            # Return overall user context from the graph
            context = await kg.get_user_context(user_id=user_id)
            return {
                "user_id": user_id,
                "context": context,
            }
    except Exception as e:
        logger.error(f"Knowledge graph query failed: {e}")
        return {
            "error": str(e),
            "message": "Knowledge graph query failed. Neo4j may be unavailable.",
        }
