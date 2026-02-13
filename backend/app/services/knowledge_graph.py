"""Knowledge Graph service for managing the per-user graph in Neo4j.

All methods are no-ops when Neo4j is unavailable.
"""

import logging
from datetime import datetime
from typing import Any

from app.core.neo4j import get_neo4j_session, is_neo4j_available

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """Methods for upserting/querying the Neo4j knowledge graph."""

    async def upsert_node(
        self,
        label: str,
        node_id: str,
        properties: dict[str, Any],
    ) -> None:
        """Create or update a node with the given label and properties."""
        if not is_neo4j_available():
            return

        props = {**properties, "id": node_id, "last_updated": datetime.utcnow().isoformat()}
        set_clause = ", ".join(f"n.{k} = ${k}" for k in props)

        async with get_neo4j_session() as session:
            if session is None:
                return
            await session.run(
                f"MERGE (n:{label} {{id: $id}}) SET {set_clause}",
                **props,
            )

    async def upsert_edge(
        self,
        from_label: str,
        from_id: str,
        rel_type: str,
        to_label: str,
        to_id: str,
        properties: dict[str, Any] | None = None,
    ) -> None:
        """Create or update a relationship between two nodes."""
        if not is_neo4j_available():
            return

        props = properties or {}
        props["last_updated"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"r.{k} = ${k}" for k in props) if props else ""
        set_part = f" SET {set_clause}" if set_clause else ""

        async with get_neo4j_session() as session:
            if session is None:
                return
            await session.run(
                f"""
                MATCH (a:{from_label} {{id: $from_id}})
                MATCH (b:{to_label} {{id: $to_id}})
                MERGE (a)-[r:{rel_type}]->(b)
                {set_part}
                """,
                from_id=from_id,
                to_id=to_id,
                **props,
            )

    async def query_neighbors(
        self,
        node_label: str,
        node_id: str,
        depth: int = 1,
        limit: int = 25,
    ) -> list[dict]:
        """Find nodes connected to the given node up to `depth` hops."""
        if not is_neo4j_available():
            return []

        async with get_neo4j_session() as session:
            if session is None:
                return []
            result = await session.run(
                f"""
                MATCH (start:{node_label} {{id: $node_id}})-[r*1..{depth}]-(neighbor)
                RETURN DISTINCT labels(neighbor) AS labels, neighbor.id AS id,
                       neighbor.name AS name, type(r[0]) AS rel_type
                LIMIT $limit
                """,
                node_id=node_id,
                limit=limit,
            )
            records = [record.data() async for record in result]
            return records

    async def query_path(
        self,
        from_label: str,
        from_id: str,
        to_label: str,
        to_id: str,
    ) -> list[dict]:
        """Find the shortest path between two nodes."""
        if not is_neo4j_available():
            return []

        async with get_neo4j_session() as session:
            if session is None:
                return []
            result = await session.run(
                f"""
                MATCH path = shortestPath(
                    (a:{from_label} {{id: $from_id}})-[*..5]-(b:{to_label} {{id: $to_id}})
                )
                RETURN [node IN nodes(path) | {{labels: labels(node), id: node.id, name: node.name}}] AS nodes,
                       [rel IN relationships(path) | type(rel)] AS relationships
                """,
                from_id=from_id,
                to_id=to_id,
            )
            records = [record.data() async for record in result]
            return records

    async def get_user_context(
        self,
        user_id: str,
        limit: int = 15,
    ) -> dict:
        """Get a summary of a user's graph for agent context enrichment.

        Returns recent clients, tasks, alerts, and notable relationships.
        """
        if not is_neo4j_available():
            return {"available": False}

        context: dict[str, Any] = {"available": True}

        async with get_neo4j_session() as session:
            if session is None:
                return {"available": False}

            # Recent clients
            result = await session.run(
                """
                MATCH (u:User {id: $user_id})-[:MANAGES]->(c:Client)
                RETURN c.id AS id, c.name AS name, c.last_updated AS last_updated
                ORDER BY c.last_updated DESC
                LIMIT $limit
                """,
                user_id=user_id,
                limit=limit,
            )
            context["clients"] = [r.data() async for r in result]

            # Recent/overdue tasks
            result = await session.run(
                """
                MATCH (u:User {id: $user_id})-[:ASSIGNED_TO]->(t:Task)
                RETURN t.id AS id, t.title AS title, t.status AS status,
                       t.due_date AS due_date, t.priority AS priority
                ORDER BY t.due_date ASC
                LIMIT $limit
                """,
                user_id=user_id,
                limit=limit,
            )
            context["tasks"] = [r.data() async for r in result]

            # Active alerts
            result = await session.run(
                """
                MATCH (a:Alert)-[:TRIGGERED_FOR]->(c:Client)<-[:MANAGES]-(u:User {id: $user_id})
                WHERE a.status <> 'resolved'
                RETURN a.id AS id, a.type AS type, a.severity AS severity,
                       c.name AS client_name
                ORDER BY a.last_updated DESC
                LIMIT $limit
                """,
                user_id=user_id,
                limit=limit,
            )
            context["alerts"] = [r.data() async for r in result]

        return context


# Singleton
_kg_service: KnowledgeGraphService | None = None


def get_knowledge_graph_service() -> KnowledgeGraphService:
    global _kg_service
    if _kg_service is None:
        _kg_service = KnowledgeGraphService()
    return _kg_service
