"""NLP intent classifier using GPT-4o-mini for wealth management queries."""
import json
import logging
from dataclasses import dataclass

from app.utils.openai_client import chat_completion

logger = logging.getLogger(__name__)

INTENTS = [
    "portfolio_analysis",
    "client_lookup",
    "risk_assessment",
    "rebalance_request",
    "order_management",
    "compliance_check",
    "tax_optimization",
    "funding_analysis",
    "meeting_prep",
    "lead_management",
    "campaign_creation",
    "general_chat",
    "report_generation",
    "churn_prediction",
]

INTENT_DESCRIPTIONS = {
    "portfolio_analysis": "Questions about portfolio performance, holdings, allocation, returns",
    "client_lookup": "Looking up client details, profile, AUM, activity history",
    "risk_assessment": "Evaluating risk profiles, risk tolerance, portfolio risk metrics",
    "rebalance_request": "Requests to rebalance portfolio allocations",
    "order_management": "Placing, reviewing, or managing buy/sell orders, SIPs, SWPs",
    "compliance_check": "KYC status, compliance alerts, regulatory checks, audit trail",
    "tax_optimization": "Tax-loss harvesting, capital gains analysis, tax impact estimation",
    "funding_analysis": "Cash flow forecasts, funding requests, settlement risk, withdrawals",
    "meeting_prep": "Preparing for client meetings, generating talking points, summaries",
    "lead_management": "Lead scoring, pipeline management, conversion tracking",
    "campaign_creation": "Creating or managing marketing campaigns, email drafts",
    "general_chat": "General questions, greetings, or queries that don't fit specific categories",
    "report_generation": "Generating performance reports, analytics, monthly summaries",
    "churn_prediction": "Predicting client attrition, identifying at-risk clients",
}

CLASSIFICATION_PROMPT = """You are an intent classifier for a wealth management platform used by financial advisors.

Classify the user's message into exactly ONE of the following intents:

{intent_list}

Respond with a JSON object containing:
- "intent": the intent name (must be one of the listed intents)
- "confidence": a float between 0.0 and 1.0 indicating your confidence
- "reasoning": a brief explanation of why you chose this intent

User message: "{message}"

Respond ONLY with valid JSON, no other text."""

@dataclass
class IntentResult:
    """Result of intent classification."""
    name: str
    confidence: float
    reasoning: str

async def classify_intent(message: str) -> IntentResult:
    """Classify the intent of a user message.

    Args:
        message: The user's input message

    Returns:
        IntentResult with intent name, confidence, and reasoning
    """
    intent_list = "\n".join(
        f"- {name}: {desc}" for name, desc in INTENT_DESCRIPTIONS.items()
    )

    prompt = CLASSIFICATION_PROMPT.format(
        intent_list=intent_list,
        message=message,
    )

    try:
        response = await chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=200,
        )

        content = response.choices[0].message.content.strip()
        # Parse JSON response
        # Handle potential markdown code blocks
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(content)

        intent_name = result.get("intent", "general_chat")
        # Validate intent name
        if intent_name not in INTENTS:
            logger.warning(f"Unknown intent '{intent_name}', falling back to general_chat")
            intent_name = "general_chat"

        return IntentResult(
            name=intent_name,
            confidence=float(result.get("confidence", 0.5)),
            reasoning=result.get("reasoning", ""),
        )
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return IntentResult(
            name="general_chat",
            confidence=0.0,
            reasoning=f"Classification failed: {str(e)}",
        )
