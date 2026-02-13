"""Data migration script: Supabase PostgreSQL → New PostgreSQL.

Usage:
    python scripts/migrate_data.py --source-url <supabase_pg_url> --target-url <new_pg_url>
"""
import asyncio
import argparse
import logging
import sys
from datetime import datetime

from sqlalchemy import create_engine, inspect, text, MetaData

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Tables to migrate in order (respecting foreign key dependencies)
MIGRATION_ORDER = [
    "users",
    "user_roles",
    "profiles",
    "clients",
    "client_aum",
    "client_activities",
    "client_life_goals",
    "client_family_members",
    "client_nominees",
    "client_notes",
    "client_reminders",
    "client_tags",
    "client_consents",
    "client_documents",
    "portfolio_admin_portfolios",
    "portfolio_admin_accounts",
    "portfolio_admin_positions",
    "portfolio_admin_transactions",
    "orders",
    "payments",
    "invoices",
    "funding_requests",
    "funding_accounts",
    "funding_status_history",
    "funding_transactions",
    "funding_alerts",
    "funding_audit_log",
    "cash_balances",
    "payout_requests",
    "payout_status_history",
    "payout_transactions",
    "payout_compliance_alerts",
    "communication_logs",
    "communication_campaigns",
    "campaign_segments",
    "campaign_message_logs",
    "campaign_recipients",
    "message_templates",
    "ai_meeting_summaries",
    "sentiment_logs",
    "voice_note_transcriptions",
    "leads",
    "lead_activities",
    "lead_stage_history",
    "commission_records",
    "revenue_records",
    "churn_predictions",
    "client_engagement_scores",
    "compliance_alerts",
    "risk_profiles",
    "risk_answers",
    "audit_logs",
    "advice_records",
    "withdrawal_limits",
    "corporate_actions",
    "client_corporate_actions",
    "corporate_action_alerts",
    "conversations",
    "messages",
    "conversation_summaries",
]

def migrate_table(source_engine, target_engine, table_name: str) -> int:
    """Migrate a single table from source to target. Returns row count."""
    try:
        with source_engine.connect() as source_conn:
            # Check if table exists in source
            inspector = inspect(source_engine)
            if table_name not in inspector.get_table_names():
                logger.warning(f"  Table '{table_name}' not found in source, skipping")
                return 0

            result = source_conn.execute(text(f'SELECT * FROM "{table_name}"'))
            rows = result.fetchall()
            columns = result.keys()

            if not rows:
                logger.info(f"  Table '{table_name}': 0 rows (empty)")
                return 0

        with target_engine.begin() as target_conn:
            # Disable triggers temporarily for data loading
            target_conn.execute(text(f'ALTER TABLE "{table_name}" DISABLE TRIGGER ALL'))

            # Clear target table
            target_conn.execute(text(f'DELETE FROM "{table_name}"'))

            # Insert rows
            col_names = [str(c) for c in columns]
            placeholders = ", ".join(f":{c}" for c in col_names)
            col_list = ", ".join(f'"{c}"' for c in col_names)
            insert_sql = text(f'INSERT INTO "{table_name}" ({col_list}) VALUES ({placeholders})')

            for row in rows:
                row_dict = dict(zip(col_names, row))
                target_conn.execute(insert_sql, row_dict)

            # Re-enable triggers
            target_conn.execute(text(f'ALTER TABLE "{table_name}" ENABLE TRIGGER ALL'))

        logger.info(f"  Table '{table_name}': {len(rows)} rows migrated")
        return len(rows)

    except Exception as e:
        logger.error(f"  Table '{table_name}': FAILED - {e}")
        return -1

def main():
    parser = argparse.ArgumentParser(description="Migrate data from Supabase to new PostgreSQL")
    parser.add_argument("--source-url", required=True, help="Source (Supabase) PostgreSQL connection URL")
    parser.add_argument("--target-url", required=True, help="Target PostgreSQL connection URL")
    parser.add_argument("--tables", nargs="*", help="Specific tables to migrate (default: all)")
    args = parser.parse_args()

    logger.info("Starting data migration...")
    logger.info(f"Source: {args.source_url[:30]}...")
    logger.info(f"Target: {args.target_url[:30]}...")

    source_engine = create_engine(args.source_url)
    target_engine = create_engine(args.target_url)

    tables = args.tables or MIGRATION_ORDER

    results = {}
    start = datetime.now()

    for table in tables:
        count = migrate_table(source_engine, target_engine, table)
        results[table] = count

    elapsed = (datetime.now() - start).total_seconds()

    # Summary
    logger.info("\n=== Migration Summary ===")
    total_rows = 0
    failed = []
    for table, count in results.items():
        if count == -1:
            failed.append(table)
        elif count > 0:
            total_rows += count

    logger.info(f"Total rows migrated: {total_rows}")
    logger.info(f"Tables migrated: {len(results) - len(failed)}")
    logger.info(f"Tables failed: {len(failed)}")
    if failed:
        logger.error(f"Failed tables: {', '.join(failed)}")
    logger.info(f"Time elapsed: {elapsed:.1f}s")

    source_engine.dispose()
    target_engine.dispose()

    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
