"""Natural language to structured query parser for filter/search requests."""
import json
import logging
from dataclasses import dataclass, field

from app.utils.openai_client import chat_completion

logger = logging.getLogger(__name__)

QUERY_PARSER_PROMPT = """You are a query parser for a wealth management platform database. Convert the user's natural language request into a structured filter/search query.

Available filter fields and their types:
- client: name (string), risk_profile (enum: conservative/moderate/aggressive/very_aggressive), aum_min (number), aum_max (number), status (enum: active/inactive/prospect), advisor_id (uuid)
- portfolio: client_id (uuid), asset_class (enum: equity/debt/gold/real_estate/hybrid), min_value (number), max_value (number)
- order: status (enum: pending/executed/cancelled/partial), order_type (enum: buy/sell/sip/swp/switch), from_date (date), to_date (date)
- lead: stage (enum: new/contacted/qualified/proposal/negotiation/won/lost), source (string), score_min (number)
- compliance: alert_type (string), severity (enum: low/medium/high/critical), resolved (boolean)

User message: "{message}"

Respond with a JSON object containing:
- "table": the primary table to query (e.g., "client", "portfolio", "order", "lead", "compliance")
- "filters": object with field-value pairs to filter by
- "sort_by": field to sort by (optional)
- "sort_order": "asc" or "desc" (optional)
- "limit": number of results to return (optional, default 20)
- "search_text": free-text search string if applicable (optional)

If the message is not a data query, return {{"table": null, "filters": {{}}}}.

Respond ONLY with valid JSON, no other text."""

@dataclass
class QueryResult:
    """Result of natural language query parsing."""
    table: str | None
    filters: dict = field(default_factory=dict)
    sort_by: str | None = None
    sort_order: str = "desc"
    limit: int = 20
    search_text: str | None = None

    def is_valid_query(self) -> bool:
        """Check if this represents a valid database query."""
        return self.table is not None

    def to_dict(self) -> dict:
        return {
            "table": self.table,
            "filters": self.filters,
            "sort_by": self.sort_by,
            "sort_order": self.sort_order,
            "limit": self.limit,
            "search_text": self.search_text,
        }

async def parse_query(message: str) -> QueryResult:
    """Parse a natural language message into a structured query.

    Args:
        message: The user's natural language request

    Returns:
        QueryResult with table, filters, sort, and limit info
    """
    prompt = QUERY_PARSER_PROMPT.format(message=message)

    try:
        response = await chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=300,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(content)

        return QueryResult(
            table=result.get("table"),
            filters=result.get("filters", {}),
            sort_by=result.get("sort_by"),
            sort_order=result.get("sort_order", "desc"),
            limit=result.get("limit", 20),
            search_text=result.get("search_text"),
        )
    except Exception as e:
        logger.error(f"Query parsing failed: {e}")
        return QueryResult(table=None)
