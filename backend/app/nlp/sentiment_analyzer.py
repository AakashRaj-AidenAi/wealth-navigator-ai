"""NLP sentiment analyzer using GPT-4o-mini for client communications."""
import json
import logging
from dataclasses import dataclass

from app.utils.openai_client import chat_completion

logger = logging.getLogger(__name__)

SENTIMENT_PROMPT = """You are a sentiment analyzer for a wealth management platform. Analyze the sentiment of the following message from a financial context.

Consider:
- Urgency and concern about investments
- Satisfaction or dissatisfaction with portfolio performance
- Trust or distrust toward the advisor
- Anxiety about market conditions
- Enthusiasm about investment opportunities

Message: "{message}"

Respond with a JSON object containing:
- "score": a float between -1.0 (very negative) and 1.0 (very positive), 0.0 is neutral
- "classification": one of "positive", "neutral", "negative"
- "emotions": array of detected emotions (e.g., ["anxious", "frustrated"], ["confident", "optimistic"])
- "urgency": "low", "medium", or "high" - how urgently this needs attention

Respond ONLY with valid JSON, no other text."""

@dataclass
class SentimentResult:
    """Result of sentiment analysis."""
    score: float  # -1.0 to 1.0
    classification: str  # "positive", "neutral", "negative"
    emotions: list[str]
    urgency: str  # "low", "medium", "high"

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "classification": self.classification,
            "emotions": self.emotions,
            "urgency": self.urgency,
        }

async def analyze_sentiment(message: str) -> SentimentResult:
    """Analyze the sentiment of a message.

    Args:
        message: The text to analyze

    Returns:
        SentimentResult with score, classification, emotions, and urgency
    """
    prompt = SENTIMENT_PROMPT.format(message=message)

    try:
        response = await chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=200,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(content)

        score = max(-1.0, min(1.0, float(result.get("score", 0.0))))
        classification = result.get("classification", "neutral")
        if classification not in ("positive", "neutral", "negative"):
            classification = "neutral"

        return SentimentResult(
            score=score,
            classification=classification,
            emotions=result.get("emotions", []),
            urgency=result.get("urgency", "low"),
        )
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        return SentimentResult(
            score=0.0,
            classification="neutral",
            emotions=[],
            urgency="low",
        )
