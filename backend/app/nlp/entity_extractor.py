"""NLP entity extractor using GPT-4o-mini for wealth management queries."""
import json
import logging
from dataclasses import dataclass, field

from app.utils.openai_client import chat_completion

logger = logging.getLogger(__name__)

ENTITY_TYPES = {
    "CLIENT_NAME": "Client name reference (e.g., 'Rajesh Kumar', 'Mrs. Sharma')",
    "TICKER_SYMBOL": "Stock or mutual fund ticker/name (e.g., 'HDFC', 'RELIANCE', 'Nifty 50')",
    "AMOUNT": "Monetary amount (e.g., '50 lakhs', '1 crore', '₹5,00,000')",
    "DATE": "Date or time reference (e.g., 'next week', 'March 15', 'last quarter')",
    "PERCENTAGE": "Percentage value (e.g., '60%', '5.5%', 'twenty percent')",
    "ACCOUNT_ID": "Account, portfolio, or folio identifier",
    "RISK_LEVEL": "Risk classification (e.g., 'conservative', 'moderate', 'aggressive')",
    "ASSET_CLASS": "Asset class (e.g., 'equity', 'debt', 'gold', 'real estate', 'hybrid')",
    "ORDER_TYPE": "Order/transaction type (e.g., 'buy', 'sell', 'SIP', 'SWP', 'switch')",
}

EXTRACTION_PROMPT = """You are an entity extractor for a wealth management platform used by Indian financial advisors.

Extract named entities from the user's message. Only extract entities that are clearly present.

Entity types to look for:
{entity_types}

User message: "{message}"

Respond with a JSON object containing an "entities" array. Each entity should have:
- "type": one of the entity types listed above
- "value": the extracted value as a string
- "original_text": the exact text from the message that matched

If no entities are found, return {{"entities": []}}

Respond ONLY with valid JSON, no other text."""

@dataclass
class Entity:
    """A single extracted entity."""
    type: str
    value: str
    original_text: str

@dataclass
class EntityResult:
    """Result of entity extraction."""
    entities: list[Entity] = field(default_factory=list)

    def get_by_type(self, entity_type: str) -> list[Entity]:
        """Get all entities of a specific type."""
        return [e for e in self.entities if e.type == entity_type]

    def has_type(self, entity_type: str) -> bool:
        """Check if any entity of the given type was extracted."""
        return any(e.type == entity_type for e in self.entities)

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "entities": [
                {"type": e.type, "value": e.value, "original_text": e.original_text}
                for e in self.entities
            ]
        }

async def extract_entities(message: str) -> EntityResult:
    """Extract named entities from a user message.

    Args:
        message: The user's input message

    Returns:
        EntityResult containing all extracted entities
    """
    entity_types = "\n".join(
        f"- {etype}: {desc}" for etype, desc in ENTITY_TYPES.items()
    )

    prompt = EXTRACTION_PROMPT.format(
        entity_types=entity_types,
        message=message,
    )

    try:
        response = await chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=500,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(content)

        entities = []
        for entity_data in result.get("entities", []):
            entity_type = entity_data.get("type", "")
            if entity_type in ENTITY_TYPES:
                entities.append(Entity(
                    type=entity_type,
                    value=entity_data.get("value", ""),
                    original_text=entity_data.get("original_text", ""),
                ))

        return EntityResult(entities=entities)
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        return EntityResult(entities=[])
