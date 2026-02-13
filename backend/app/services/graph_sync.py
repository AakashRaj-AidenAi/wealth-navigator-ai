"""Async functions to sync PostgreSQL entities into the Neo4j knowledge graph.

Each sync function is designed to be called as a background task after
SQLAlchemy model events (after_insert / after_update).
"""

import logging

from app.services.knowledge_graph import get_knowledge_graph_service
from app.core.neo4j import is_neo4j_available

logger = logging.getLogger(__name__)


async def sync_client(
    user_id: str,
    client_id: str,
    name: str,
    email: str | None = None,
    status: str | None = None,
) -> None:
    """Sync a Client node and MANAGES edge to Neo4j."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("Client", client_id, {
        "name": name,
        "email": email or "",
        "status": status or "active",
        "user_id": user_id,
    })
    await kg.upsert_edge("User", user_id, "MANAGES", "Client", client_id)


async def sync_portfolio(
    client_id: str,
    portfolio_id: str,
    name: str | None = None,
    total_value: float | None = None,
) -> None:
    """Sync a Portfolio node and OWNS edge to Neo4j."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("Portfolio", portfolio_id, {
        "name": name or "Portfolio",
        "total_value": total_value or 0,
        "client_id": client_id,
    })
    await kg.upsert_edge("Client", client_id, "OWNS", "Portfolio", portfolio_id)


async def sync_task(
    user_id: str,
    task_id: str,
    title: str,
    status: str = "pending",
    client_id: str | None = None,
    due_date: str | None = None,
    priority: str | None = None,
) -> None:
    """Sync a Task node with ASSIGNED_TO and optional RELATED_TO edges."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("Task", task_id, {
        "title": title,
        "status": status,
        "due_date": due_date or "",
        "priority": priority or "medium",
        "user_id": user_id,
    })
    await kg.upsert_edge("User", user_id, "ASSIGNED_TO", "Task", task_id)

    if client_id:
        await kg.upsert_edge("Task", task_id, "RELATED_TO", "Client", client_id)


async def sync_alert(
    user_id: str,
    alert_id: str,
    alert_type: str,
    severity: str = "medium",
    client_id: str | None = None,
    status: str = "active",
) -> None:
    """Sync an Alert node with TRIGGERED_FOR edge."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("Alert", alert_id, {
        "type": alert_type,
        "severity": severity,
        "status": status,
        "user_id": user_id,
    })

    if client_id:
        await kg.upsert_edge("Alert", alert_id, "TRIGGERED_FOR", "Client", client_id)


async def sync_conversation(
    user_id: str,
    conversation_id: str,
    title: str,
    client_id: str | None = None,
) -> None:
    """Sync a Conversation node with optional ABOUT edge."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("Conversation", conversation_id, {
        "title": title,
        "user_id": user_id,
    })

    if client_id:
        await kg.upsert_edge(
            "Conversation", conversation_id, "ABOUT", "Client", client_id
        )


async def sync_user(user_id: str, name: str, email: str, role: str = "advisor") -> None:
    """Sync a User node to Neo4j."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("User", user_id, {
        "name": name,
        "email": email,
        "role": role,
    })


async def sync_goal(
    client_id: str,
    goal_id: str,
    name: str,
    target_amount: float | None = None,
    current_amount: float | None = None,
    target_date: str | None = None,
) -> None:
    """Sync a Goal node with RELATED_TO edge to Client."""
    if not is_neo4j_available():
        return

    kg = get_knowledge_graph_service()
    await kg.upsert_node("Goal", goal_id, {
        "name": name,
        "target_amount": target_amount or 0,
        "current_amount": current_amount or 0,
        "target_date": target_date or "",
        "client_id": client_id,
    })
    await kg.upsert_edge("Client", client_id, "HAS_GOAL", "Goal", goal_id)
