"""Client domain ORM models.

Defines all client-related tables: clients, AUM snapshots, activities,
life-goals, family members, nominees, notes, reminders, tags, consents,
documents, and advisor profiles.

Every model inherits from both ``BaseMixin`` (id, created_at, updated_at)
and the declarative ``Base``.
"""

import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseMixin


# ---------------------------------------------------------------------------
# Profile (advisor / user profile synced from auth provider)
# ---------------------------------------------------------------------------


class Profile(BaseMixin, Base):
    """Advisor / user profile mirrored from the auth provider."""

    __tablename__ = "profiles"

    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class Client(BaseMixin, Base):
    """Core client record owned by an advisor."""

    __tablename__ = "clients"

    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    client_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    client_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # individual | corporate | trust | huf | nri
    risk_profile: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    total_assets: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    kyc_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    aadhar_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    annual_income: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source_of_wealth: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    investment_experience: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    preferred_communication: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # -- relationships -------------------------------------------------------
    client_aum: Mapped[List["ClientAUM"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    goals: Mapped[List["ClientLifeGoal"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    activities: Mapped[List["ClientActivity"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    family_members: Mapped[List["ClientFamilyMember"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    nominees: Mapped[List["ClientNominee"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    notes: Mapped[List["ClientNote"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    reminders: Mapped[List["ClientReminder"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    documents: Mapped[List["ClientDocument"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    consents: Mapped[List["ClientConsent"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    tags: Mapped[List["ClientTag"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    communication_logs: Mapped[List["CommunicationLog"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    ai_meeting_summaries: Mapped[List["AiMeetingSummary"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    sentiment_logs: Mapped[List["SentimentLog"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    voice_note_transcriptions: Mapped[List["VoiceNoteTranscription"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    campaign_message_logs: Mapped[List["CampaignMessageLog"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    campaign_recipients: Mapped[List["CampaignRecipient"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Client AUM (Assets Under Management snapshot)
# ---------------------------------------------------------------------------


class ClientAUM(BaseMixin, Base):
    """Point-in-time snapshot of a client's assets under management."""

    __tablename__ = "client_aum"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    current_aum: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    equity_aum: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    debt_aum: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    hybrid_aum: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    other_assets: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    last_updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="client_aum")


# ---------------------------------------------------------------------------
# Client Activity
# ---------------------------------------------------------------------------


class ClientActivity(BaseMixin, Base):
    """Audit-style log of interactions and events for a client."""

    __tablename__ = "client_activities"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    activity_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # call | meeting | email | note | task | document | login | portfolio_update
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    activity_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="activities")


# ---------------------------------------------------------------------------
# Client Life Goal
# ---------------------------------------------------------------------------


class ClientLifeGoal(BaseMixin, Base):
    """Financial goal tracked for a client (e.g. retirement, education)."""

    __tablename__ = "client_life_goals"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    goal_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    target_amount: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    current_amount: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    monthly_sip: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    priority: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="active", server_default="active"
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="goals")


# ---------------------------------------------------------------------------
# Client Family Member
# ---------------------------------------------------------------------------


class ClientFamilyMember(BaseMixin, Base):
    """Family member associated with a client."""

    __tablename__ = "client_family_members"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    relationship: Mapped[str] = mapped_column(String, nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_nominee: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    occupation: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="family_members")


# ---------------------------------------------------------------------------
# Client Nominee
# ---------------------------------------------------------------------------


class ClientNominee(BaseMixin, Base):
    """Legal nominee registered for a client's holdings."""

    __tablename__ = "client_nominees"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    relationship: Mapped[str] = mapped_column(String, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    id_proof_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    id_proof_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="nominees")


# ---------------------------------------------------------------------------
# Client Note
# ---------------------------------------------------------------------------


class ClientNote(BaseMixin, Base):
    """Free-form note attached to a client by an advisor."""

    __tablename__ = "client_notes"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="notes")


# ---------------------------------------------------------------------------
# Client Reminder
# ---------------------------------------------------------------------------


class ClientReminder(BaseMixin, Base):
    """Scheduled reminder for an advisor regarding a client."""

    __tablename__ = "client_reminders"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    reminder_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # follow_up | kyc_renewal | birthday | review | custom
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reminder_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    is_recurring: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    recurrence_interval: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="reminders")


# ---------------------------------------------------------------------------
# Client Tag
# ---------------------------------------------------------------------------


class ClientTag(BaseMixin, Base):
    """Label / tag applied to a client for segmentation."""

    __tablename__ = "client_tags"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    tag: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # vip | high_net_worth | new_client | at_risk | dormant | sip_active | nri | senior_citizen

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="tags")


# ---------------------------------------------------------------------------
# Client Consent
# ---------------------------------------------------------------------------


class ClientConsent(BaseMixin, Base):
    """Regulatory / legal consent record for a client."""

    __tablename__ = "client_consents"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    consent_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # terms_conditions | privacy_policy | marketing | data_sharing | advisory_agreement
    status: Mapped[str] = mapped_column(
        String, default="pending", server_default="pending"
    )
    signed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    document_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="consents")


# ---------------------------------------------------------------------------
# Client Document
# ---------------------------------------------------------------------------


class ClientDocument(BaseMixin, Base):
    """Uploaded document (KYC proof, statements, etc.) for a client."""

    __tablename__ = "client_documents"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    advisor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    document_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # pan_card | aadhar_card | passport | bank_statement | income_proof | address_proof | photograph | signature | other
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verified_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # -- relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="documents")
