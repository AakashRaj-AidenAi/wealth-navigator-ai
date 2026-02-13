"""Client onboarding tools for AI agents.

Provides tool functions for managing the client onboarding workflow --
status checks, initiation, document collection tracking, risk profiling,
and initial portfolio allocation suggestions.
All functions use async SQLAlchemy sessions and return JSON-serializable dicts.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import tool
from app.models.client import Client, ClientDocument


# ---------------------------------------------------------------------------
# get_onboarding_status
# ---------------------------------------------------------------------------


@tool(
    name="get_onboarding_status",
    description=(
        "Check the onboarding progress for a client. Returns completion "
        "status of each onboarding step: KYC, documents, risk profile, "
        "and initial allocation."
    ),
)
async def get_onboarding_status(
    client_id: str,
    db: AsyncSession = None,
) -> dict:
    """Return the onboarding progress for a client."""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    # Check document collection status
    docs_result = await db.execute(
        select(ClientDocument).where(ClientDocument.client_id == client_id)
    )
    docs = docs_result.scalars().all()

    required_docs = ["pan_card", "aadhar_card", "address_proof", "photograph", "signature"]
    collected_types = {d.document_type for d in docs}
    missing_docs = [dt for dt in required_docs if dt not in collected_types]
    verified_docs = [d.document_type for d in docs if d.is_verified]

    # Check KYC status
    kyc_complete = client.pan_number is not None and client.kyc_expiry_date is not None

    # Check risk profile
    risk_profiled = client.risk_profile is not None and client.risk_profile != ""

    # Overall completion
    steps = {
        "personal_details": bool(client.email or client.phone),
        "kyc_verification": kyc_complete,
        "document_collection": len(missing_docs) == 0,
        "risk_profiling": risk_profiled,
        "initial_allocation": client.onboarding_completed,
    }
    completed_steps = sum(1 for v in steps.values() if v)
    total_steps = len(steps)

    return {
        "client_id": str(client.id),
        "client_name": client.client_name,
        "onboarding_completed": client.onboarding_completed,
        "progress_pct": round((completed_steps / total_steps) * 100, 1),
        "steps": steps,
        "completed_steps": completed_steps,
        "total_steps": total_steps,
        "documents": {
            "collected": list(collected_types),
            "verified": verified_docs,
            "missing": missing_docs,
        },
        "kyc_status": "complete" if kyc_complete else "incomplete",
        "risk_profile": client.risk_profile or "not_assessed",
    }


# ---------------------------------------------------------------------------
# start_onboarding
# ---------------------------------------------------------------------------


@tool(
    name="start_onboarding",
    description=(
        "Start the onboarding process for a new client. Creates a client "
        "record with basic information. Returns the new client ID."
    ),
)
async def start_onboarding(
    client_name: str,
    email: str,
    phone: str = "",
    db: AsyncSession = None,
) -> dict:
    """Create a new client record to begin onboarding.

    Note: This requires an advisor_id which should come from context.
    Since we cannot infer it here, we create with a placeholder that
    the calling agent should update.
    """
    # Check if client with same email already exists
    if email:
        existing = await db.execute(
            select(Client).where(Client.email == email)
        )
        if existing.scalar_one_or_none():
            return {
                "error": f"A client with email {email} already exists.",
                "hint": "Use get_onboarding_status to check their progress.",
            }

    new_client = Client(
        id=uuid.uuid4(),
        advisor_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),  # placeholder
        client_name=client_name,
        email=email or None,
        phone=phone or None,
        client_type="individual",
        is_active=True,
        onboarding_completed=False,
    )
    db.add(new_client)
    await db.flush()

    return {
        "client_id": str(new_client.id),
        "client_name": client_name,
        "email": email,
        "phone": phone,
        "status": "onboarding_started",
        "next_steps": [
            "Collect PAN card and Aadhaar for KYC verification",
            "Upload required documents (PAN, Aadhaar, address proof, photo, signature)",
            "Complete risk profiling questionnaire",
            "Generate initial portfolio allocation",
        ],
        "message": "Client onboarding initiated successfully.",
    }


# ---------------------------------------------------------------------------
# collect_documents
# ---------------------------------------------------------------------------


@tool(
    name="collect_documents",
    description=(
        "Track document collection for a client during onboarding. "
        "Records that a specific document type has been received. "
        "Supported doc_type: pan_card, aadhar_card, passport, "
        "bank_statement, income_proof, address_proof, photograph, signature."
    ),
)
async def collect_documents(
    client_id: str,
    doc_type: str,
    db: AsyncSession = None,
) -> dict:
    """Record that a document has been collected for a client."""
    # Verify client exists
    client_result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    valid_types = [
        "pan_card", "aadhar_card", "passport", "bank_statement",
        "income_proof", "address_proof", "photograph", "signature", "other",
    ]
    if doc_type not in valid_types:
        return {
            "error": f"Invalid document type: {doc_type}",
            "valid_types": valid_types,
        }

    # Check if already collected
    existing = await db.execute(
        select(ClientDocument).where(
            ClientDocument.client_id == client_id,
            ClientDocument.document_type == doc_type,
        )
    )
    if existing.scalar_one_or_none():
        return {
            "client_id": client_id,
            "doc_type": doc_type,
            "status": "already_collected",
            "message": f"{doc_type} has already been collected for this client.",
        }

    new_doc = ClientDocument(
        id=uuid.uuid4(),
        client_id=client_id,
        advisor_id=client.advisor_id,
        document_type=doc_type,
        file_name=f"{doc_type}_{client_id}.pdf",
        file_path=f"/documents/{client_id}/{doc_type}.pdf",
        is_verified=False,
    )
    db.add(new_doc)
    await db.flush()

    # Check remaining required docs
    required_docs = ["pan_card", "aadhar_card", "address_proof", "photograph", "signature"]
    all_docs_result = await db.execute(
        select(ClientDocument.document_type).where(
            ClientDocument.client_id == client_id
        )
    )
    collected_types = {row[0] for row in all_docs_result.all()}
    missing = [dt for dt in required_docs if dt not in collected_types]

    return {
        "client_id": client_id,
        "doc_type": doc_type,
        "status": "collected",
        "missing_required_docs": missing,
        "all_docs_complete": len(missing) == 0,
        "message": f"{doc_type} collected successfully.",
    }


# ---------------------------------------------------------------------------
# run_risk_profile
# ---------------------------------------------------------------------------


@tool(
    name="run_risk_profile",
    description=(
        "Run the risk profiling assessment for a client. Returns a risk "
        "score and suggested risk category based on client profile data."
    ),
)
async def run_risk_profile(
    client_id: str,
    db: AsyncSession = None,
) -> dict:
    """Assess and assign a risk profile to a client.

    Uses a simplified scoring model based on available client data.
    In production, this would use a full questionnaire.
    """
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    # Simple risk scoring based on available data
    score = 50  # Base score (moderate)

    # Age-based adjustment
    if client.date_of_birth:
        age = (date.today() - client.date_of_birth).days // 365
        if age < 30:
            score += 20  # Young = can take more risk
        elif age < 45:
            score += 10
        elif age < 60:
            score -= 5
        else:
            score -= 15  # Senior = conservative

    # Income-based adjustment
    if client.annual_income:
        if client.annual_income > 5000000:  # > 50L
            score += 10
        elif client.annual_income > 1500000:  # > 15L
            score += 5

    # Investment experience
    if client.investment_experience:
        exp = client.investment_experience.lower()
        if "advanced" in exp or "expert" in exp:
            score += 15
        elif "intermediate" in exp:
            score += 5
        elif "beginner" in exp or "none" in exp:
            score -= 10

    # Clamp score
    score = max(0, min(100, score))

    # Map to risk profile
    if score >= 75:
        risk_profile = "aggressive"
    elif score >= 55:
        risk_profile = "moderately_aggressive"
    elif score >= 40:
        risk_profile = "moderate"
    elif score >= 25:
        risk_profile = "moderately_conservative"
    else:
        risk_profile = "conservative"

    # Update client
    client.risk_profile = risk_profile
    await db.flush()

    return {
        "client_id": str(client.id),
        "client_name": client.client_name,
        "risk_score": score,
        "risk_profile": risk_profile,
        "factors": {
            "base_score": 50,
            "age_adjustment": score - 50,  # simplified
            "income_factor": "high" if (client.annual_income or 0) > 1500000 else "standard",
            "experience": client.investment_experience or "not_provided",
        },
        "message": f"Risk profile assessed as '{risk_profile}' (score: {score}/100).",
    }


# ---------------------------------------------------------------------------
# generate_initial_allocation
# ---------------------------------------------------------------------------


@tool(
    name="generate_initial_allocation",
    description=(
        "Generate an initial portfolio allocation recommendation for a "
        "new client based on their risk score. Returns suggested asset "
        "class weights and recommended Indian financial products."
    ),
)
async def generate_initial_allocation(
    client_id: str,
    risk_score: int,
    db: AsyncSession = None,
) -> dict:
    """Suggest initial portfolio allocation based on risk score."""
    # Verify client exists
    client_result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        return {"error": f"Client {client_id} not found"}

    # Allocation models based on risk score
    if risk_score >= 75:
        allocation = {
            "equity": 70,
            "debt": 15,
            "gold": 10,
            "international": 5,
        }
        products = [
            {"type": "Large Cap Fund", "allocation_pct": 25, "example": "NIFTY 50 Index Fund"},
            {"type": "Flexi Cap Fund", "allocation_pct": 20, "example": "Parag Parikh Flexi Cap"},
            {"type": "Mid Cap Fund", "allocation_pct": 15, "example": "NIFTY Midcap 150 Index"},
            {"type": "Small Cap Fund", "allocation_pct": 10, "example": "NIFTY Smallcap 250 Index"},
            {"type": "Corporate Bond Fund", "allocation_pct": 15, "example": "Short Duration Fund"},
            {"type": "Gold", "allocation_pct": 10, "example": "Sovereign Gold Bond / Gold ETF"},
            {"type": "International Equity", "allocation_pct": 5, "example": "NASDAQ 100 FoF"},
        ]
        strategy = "Growth-oriented"
    elif risk_score >= 55:
        allocation = {
            "equity": 55,
            "debt": 30,
            "gold": 10,
            "international": 5,
        }
        products = [
            {"type": "Large Cap Fund", "allocation_pct": 25, "example": "NIFTY 50 Index Fund"},
            {"type": "Flexi Cap Fund", "allocation_pct": 15, "example": "Flexi Cap Fund"},
            {"type": "Mid Cap Fund", "allocation_pct": 10, "example": "Midcap Index Fund"},
            {"type": "Balanced Advantage", "allocation_pct": 5, "example": "Balanced Advantage Fund"},
            {"type": "Short Duration Fund", "allocation_pct": 15, "example": "Short Duration Fund"},
            {"type": "Corporate Bond", "allocation_pct": 15, "example": "Corporate Bond Fund"},
            {"type": "Gold", "allocation_pct": 10, "example": "Sovereign Gold Bond"},
            {"type": "International", "allocation_pct": 5, "example": "US Equity FoF"},
        ]
        strategy = "Balanced growth"
    elif risk_score >= 40:
        allocation = {
            "equity": 40,
            "debt": 45,
            "gold": 10,
            "international": 5,
        }
        products = [
            {"type": "Large Cap Fund", "allocation_pct": 20, "example": "NIFTY 50 Index Fund"},
            {"type": "Balanced Advantage", "allocation_pct": 20, "example": "Balanced Advantage Fund"},
            {"type": "Medium Duration Fund", "allocation_pct": 20, "example": "Medium Duration Fund"},
            {"type": "Short Duration Fund", "allocation_pct": 15, "example": "Short Duration Fund"},
            {"type": "PPF/EPF", "allocation_pct": 10, "example": "PPF Account"},
            {"type": "Gold", "allocation_pct": 10, "example": "Sovereign Gold Bond"},
            {"type": "International", "allocation_pct": 5, "example": "Conservative Global Fund"},
        ]
        strategy = "Moderate balanced"
    else:
        allocation = {
            "equity": 25,
            "debt": 60,
            "gold": 10,
            "international": 5,
        }
        products = [
            {"type": "Large Cap Fund", "allocation_pct": 15, "example": "NIFTY 50 Index Fund"},
            {"type": "Balanced Advantage", "allocation_pct": 10, "example": "Conservative Hybrid"},
            {"type": "Short Duration Fund", "allocation_pct": 25, "example": "Short Duration Fund"},
            {"type": "FD/RD", "allocation_pct": 20, "example": "Bank Fixed Deposit"},
            {"type": "PPF", "allocation_pct": 15, "example": "PPF Account"},
            {"type": "Gold", "allocation_pct": 10, "example": "Sovereign Gold Bond"},
            {"type": "International", "allocation_pct": 5, "example": "Conservative Global Fund"},
        ]
        strategy = "Capital preservation"

    return {
        "client_id": str(client.id),
        "client_name": client.client_name,
        "risk_score": risk_score,
        "risk_profile": client.risk_profile or "moderate",
        "strategy": strategy,
        "allocation": allocation,
        "recommended_products": products,
        "notes": (
            "This is an initial allocation recommendation. Adjust based on "
            "specific financial goals, tax situation, and liquidity needs. "
            "Review and rebalance quarterly."
        ),
    }
