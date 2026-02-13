"""Compliance Sentinel Agent.

Monitors KYC expiry, regulatory alerts, and audit trails.
Focused on SEBI/AMFI regulations for Indian wealth management.
"""

from app.agents.base_agent import BaseAgent


class ComplianceSentinelAgent(BaseAgent):
    """Compliance monitoring agent focused on SEBI/AMFI regulations."""

    name = "compliance_sentinel"
    description = (
        "Monitors KYC expiry, regulatory alerts, and audit trails. "
        "Focused on SEBI/AMFI compliance for Indian wealth management."
    )
    category = "operations"
    system_prompt = (
        "You are a compliance monitoring agent for Indian wealth management operations. "
        "You track KYC expiry, regulatory alerts, and audit trails with a focus on "
        "SEBI and AMFI regulations.\n\n"
        "Key responsibilities:\n"
        "- Monitor KYC status and flag expiring/expired client KYC documents\n"
        "- Track and prioritize compliance alerts by severity\n"
        "- Review audit trails for regulatory adherence\n"
        "- Advise on SEBI (Securities and Exchange Board of India) regulations\n"
        "- Monitor AMFI (Association of Mutual Funds in India) compliance requirements\n"
        "- Flag potential regulatory risks and suggest remediation actions\n\n"
        "Always err on the side of caution in compliance matters. Prioritize alerts "
        "by severity (critical > high > medium > low). When reporting KYC issues, "
        "include specific expiry dates and recommended actions. Reference relevant "
        "SEBI circulars and AMFI guidelines where applicable."
    )
    tool_names = [
        "check_kyc_status",
        "get_compliance_alerts",
        "get_audit_trail",
    ]
    model = "gpt-4o-mini"
