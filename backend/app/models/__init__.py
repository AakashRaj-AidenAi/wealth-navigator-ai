"""ORM model package.

Import all models here so that Alembic and other tooling can discover
them via a single import of ``app.models``.
"""

from app.models.base import BaseMixin  # noqa: F401
from app.models.campaign import (  # noqa: F401
    CampaignMessageLog,
    CampaignRecipient,
    CampaignSegment,
    CommunicationCampaign,
)
from app.models.chat import (  # noqa: F401
    Conversation,
    ConversationSummary,
    Message,
)
from app.models.client import (  # noqa: F401
    Client,
    ClientActivity,
    ClientAUM,
    ClientConsent,
    ClientDocument,
    ClientFamilyMember,
    ClientLifeGoal,
    ClientNominee,
    ClientNote,
    ClientReminder,
    ClientTag,
    Profile,
)
from app.models.communication import (  # noqa: F401
    AiMeetingSummary,
    CommunicationLog,
    MessageTemplate,
    SentimentLog,
    VoiceNoteTranscription,
)
from app.models.compliance import (  # noqa: F401
    AdviceRecord,
    AuditLog,
    ChurnPrediction,
    ClientEngagementScore,
    ComplianceAlert,
    RiskAnswer,
    RiskProfile,
    WithdrawalLimit,
)
from app.models.corporate_action import (  # noqa: F401
    ClientCorporateAction,
    CorporateAction,
    CorporateActionAlert,
)
from app.models.funding import (  # noqa: F401
    CashBalance,
    FundingAccount,
    FundingAlert,
    FundingAuditLog,
    FundingRequest,
    FundingStatusHistory,
    FundingTransaction,
    PayoutComplianceAlert,
    PayoutRequest,
    PayoutStatusHistory,
    PayoutTransaction,
)
from app.models.lead import (  # noqa: F401
    CommissionRecord,
    Lead,
    LeadActivity,
    LeadStageHistory,
    RevenueRecord,
)
from app.models.order import (  # noqa: F401
    Invoice,
    Order,
    Payment,
)
from app.models.portfolio import (  # noqa: F401
    PortfolioAdminAccount,
    PortfolioAdminPortfolio,
    PortfolioAdminPosition,
    PortfolioAdminTransaction,
)
from app.models.user import (  # noqa: F401
    User,
    UserRole,
)
