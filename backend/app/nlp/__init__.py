"""NLP pipeline that runs intent, entity, sentiment analysis concurrently."""
import asyncio
import logging
from dataclasses import dataclass, field

from app.nlp.intent_classifier import classify_intent, IntentResult
from app.nlp.entity_extractor import extract_entities, EntityResult
from app.nlp.sentiment_analyzer import analyze_sentiment, SentimentResult
from app.nlp.query_parser import parse_query, QueryResult

logger = logging.getLogger(__name__)

@dataclass
class NLPResult:
    """Combined result from all NLP pipeline stages."""
    intent: IntentResult
    entities: EntityResult
    sentiment: SentimentResult
    query: QueryResult | None = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {
            "intent": {
                "name": self.intent.name,
                "confidence": self.intent.confidence,
                "reasoning": self.intent.reasoning,
            },
            "entities": self.entities.to_dict(),
            "sentiment": self.sentiment.to_dict(),
        }
        if self.query and self.query.is_valid_query():
            result["query"] = self.query.to_dict()
        return result

class NLPPipeline:
    """Runs intent classification, entity extraction, and sentiment analysis concurrently."""

    async def process(self, message: str, include_query_parse: bool = True) -> NLPResult:
        """Process a message through the full NLP pipeline.

        Args:
            message: User input text
            include_query_parse: Whether to also parse for structured queries

        Returns:
            NLPResult with intent, entities, sentiment, and optional query
        """
        tasks = [
            classify_intent(message),
            extract_entities(message),
            analyze_sentiment(message),
        ]

        if include_query_parse:
            tasks.append(parse_query(message))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle potential failures gracefully
        intent = results[0] if not isinstance(results[0], Exception) else IntentResult(name="general_chat", confidence=0.0, reasoning="Pipeline error")
        entities = results[1] if not isinstance(results[1], Exception) else EntityResult()
        sentiment = results[2] if not isinstance(results[2], Exception) else SentimentResult(score=0.0, classification="neutral", emotions=[], urgency="low")

        query = None
        if include_query_parse and len(results) > 3:
            query = results[3] if not isinstance(results[3], Exception) else None

        # Log any errors
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"NLP pipeline stage {i} failed: {result}")

        return NLPResult(
            intent=intent,
            entities=entities,
            sentiment=sentiment,
            query=query,
        )

# Singleton pipeline
_pipeline: NLPPipeline | None = None

def get_nlp_pipeline() -> NLPPipeline:
    """Get the singleton NLP pipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = NLPPipeline()
    return _pipeline
