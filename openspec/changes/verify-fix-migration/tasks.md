# Tasks: verify-fix-migration

## Claude Multi-Agent Execution Strategy

| Agent ID | Subagent Type | Model | Specialty |
|---|---|---|---|
| `backend-fixer` | `general-purpose` | `opus` | Python model fixes, import validation, server startup |
| `page-migrator` | `general-purpose` | `opus` | Migrate page-level Supabase calls to API |
| `dashboard-migrator` | `general-purpose` | `opus` | Migrate dashboard widget Supabase calls to API |
| `client-migrator` | `general-purpose` | `opus` | Migrate client component Supabase calls to API |
| `domain-migrator` | `general-purpose` | `opus` | Migrate all remaining domain components |
| `build-verifier` | `general-purpose` | `sonnet` | Build validation, cleanup, error fixes |

---

## Phase A: Parallel Fixes (launch ALL simultaneously)

### Backend Fixes (`backend-fixer`)

- [x] **A.1** Rename `metadata` attribute to `extra_data` in 5 model classes (Conversation, Message, CommunicationLog, ClientActivity, LeadActivity) using `mapped_column("metadata", JSON, ...)` to preserve DB column name. Files: `app/models/chat.py`, `app/models/communication.py`, `app/models/client.py`, `app/models/lead.py`
  - `@agent: backend-fixer`
  - `@parallel: A`

- [x] **A.2** Update all Pydantic schemas that reference the `metadata` field to use `extra_data` with `alias="metadata"` for JSON compatibility. Files: `app/schemas/chat.py`, `app/schemas/lead.py`
  - `@agent: backend-fixer`
  - `@parallel: A`

- [x] **A.3** Update WebSocket chat handler and memory manager to use `extra_data` instead of `metadata` when creating Message/Conversation objects. Files: `app/api/websocket/chat.py`, `app/agents/memory.py`
  - `@agent: backend-fixer`
  - `@parallel: A`

- [x] **A.4** Verify `python -c "import app.main"` succeeds — all models load, all routes register, no import errors
  - `@agent: backend-fixer`
  - `@parallel: A` (after A.1-A.3)

- [x] **A.5** Verify `uvicorn app.main:app --host 0.0.0.0 --port 8000` starts and `/health` + `/docs` respond
  - `@agent: backend-fixer`
  - `@parallel: A` (after A.4)

### Page Files Migration (`page-migrator`)

- [x] **A.6** Migrate `src/pages/Index.tsx` — replace supabase imports with API calls, replace `supabase.from()` queries with `api.get()`. Keep component logic identical.
  - `@agent: page-migrator`
  - `@parallel: A`

- [x] **A.7** Migrate `src/pages/Clients.tsx` and `src/pages/ClientProfile.tsx` — replace supabase client/type imports with API service calls
  - `@agent: page-migrator`
  - `@parallel: A`

- [x] **A.8** Migrate `src/pages/Portfolios.tsx` and `src/pages/PortfolioAdmin.tsx` — replace supabase queries with portfolioService calls
  - `@agent: page-migrator`
  - `@parallel: A`

- [x] **A.9** Migrate `src/pages/Orders.tsx`, `src/pages/Goals.tsx`, `src/pages/Funding.tsx` — replace supabase queries with orderService/fundingService calls. Note: Funding.tsx has `supabase.functions.invoke()` that needs replacement with `api.post()`
  - `@agent: page-migrator`
  - `@parallel: A`

- [x] **A.10** Migrate `src/pages/Leads.tsx` — replace both supabase client AND type imports with API calls and inline types
  - `@agent: page-migrator`
  - `@parallel: A`

- [x] **A.11** Migrate `src/pages/Tasks.tsx`, `src/pages/Reports.tsx`, `src/pages/CorporateActions.tsx` — replace supabase queries with api.get() calls. Note: CorporateActions.tsx has `supabase.auth.getSession()` calls that need replacement
  - `@agent: page-migrator`
  - `@parallel: A`

- [x] **A.12** Migrate `src/pages/business/CEODashboard.tsx` and `src/pages/business/Invoices.tsx` — replace supabase queries with api.get() calls
  - `@agent: page-migrator`
  - `@parallel: A`

### Dashboard Components Migration (`dashboard-migrator`)

- [x] **A.13** Migrate `src/components/dashboard/ActivityFeed.tsx`, `AlertsPanel.tsx`, `ClientsTable.tsx` — replace supabase.from() with api.get()
  - `@agent: dashboard-migrator`
  - `@parallel: A`

- [x] **A.14** Migrate `src/components/dashboard/AIInsightsWidget.tsx`, `AIInsightsPanel.tsx` — replace `supabase.auth.getSession()` + `supabase.from()` with `api.getAccessToken()` + `api.get/post()`
  - `@agent: dashboard-migrator`
  - `@parallel: A`

- [x] **A.15** Migrate `src/components/dashboard/ClientsAtRiskWidget.tsx`, `ClientsNeedingAttention.tsx`, `NegativeSentimentWidget.tsx` — replace supabase queries with api.get() calls
  - `@agent: dashboard-migrator`
  - `@parallel: A`

- [x] **A.16** Migrate `src/components/dashboard/CorporateActionsWidget.tsx` — replace `supabase.auth.getSession()` + `supabase.from()` with API calls
  - `@agent: dashboard-migrator`
  - `@parallel: A`

- [x] **A.17** Migrate `src/components/dashboard/LeadsNeedingAttentionWidget.tsx`, `LeadsPipelineWidget.tsx` — replace supabase imports (including Database types) with api.get() calls
  - `@agent: dashboard-migrator`
  - `@parallel: A`

- [x] **A.18** Migrate `src/components/dashboard/PerformanceChart.tsx`, `PortfolioChart.tsx`, `TodaysPlanWidget.tsx` — replace supabase queries with api.get()
  - `@agent: dashboard-migrator`
  - `@parallel: A`

### Client Components Migration (`client-migrator`)

- [x] **A.19** Migrate `src/components/clients/ClientOverviewTab.tsx`, `ClientPortfolioTab.tsx`, `ClientPayoutsTab.tsx` — replace supabase queries with API calls
  - `@agent: client-migrator`
  - `@parallel: A`

- [x] **A.20** Migrate `src/components/clients/ClientActivityTab.tsx`, `ClientGoalsTab.tsx`, `ClientFamilyTab.tsx` — replace supabase queries with api.get/post()
  - `@agent: client-migrator`
  - `@parallel: A`

- [x] **A.21** Migrate `src/components/clients/ClientDocumentsTab.tsx` — replace supabase queries AND `supabase.storage` calls. For storage, replace with `api.post('/clients/{id}/documents/upload', formData)` with a TODO comment noting file upload endpoint needs implementation
  - `@agent: client-migrator`
  - `@parallel: A`

- [x] **A.22** Migrate `src/components/clients/ClientNotesTab.tsx`, `ClientRemindersTab.tsx`, `ClientTasksTab.tsx` — replace supabase queries with api.get/post()
  - `@agent: client-migrator`
  - `@parallel: A`

- [x] **A.23** Migrate `src/components/clients/ClientCorporateActionsTab.tsx` — replace `supabase.auth.getSession()` + `supabase.from()` with API calls
  - `@agent: client-migrator`
  - `@parallel: A`

- [x] **A.24** Migrate `src/components/clients/QuickNoteModal.tsx` — replace supabase insert with api.post()
  - `@agent: client-migrator`
  - `@parallel: A`

### Domain Components Migration (`domain-migrator`)

- [x] **A.25** Migrate `src/components/leads/` (9 files: AddLeadModal, ConvertLeadModal, LeadDetailModal, LeadQuickActionsDrawer, EnhancedLeadPipeline, LeadListView, LeadPipeline, PipelineAnalytics, RevenueForecast) — replace supabase client + Database type imports with api/leadService calls and inline types
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.26** Migrate `src/components/campaigns/` (6 files: useCampaigns.ts, CreateCampaign.tsx, CampaignTemplates.tsx, useCampaignAI.ts, useSegments.ts, useWorkflows.ts) — replace supabase queries with campaignService calls. Note: `useCampaignAI.ts` has 6 `supabase.functions.invoke()` calls → replace with `api.post('/insights/...')`
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.27** Migrate `src/components/communications/` (4 files: CommunicationHistory, MessageComposer, TemplateManager, CampaignBuilder) — replace supabase queries with api.get/post()
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.28** Migrate `src/components/compliance/` (5 files: ComplianceAlerts, AuditTrailViewer, ConsentManager, AdviceRecordsList, CommunicationLogs) — replace supabase queries with complianceService calls
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.29** Migrate `src/components/tasks/` (3 files: TaskListView, TaskKanbanView, QuickAddTask) — replace supabase queries with api.get/post()
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.30** Migrate `src/components/modals/` (5 files: AddClientModal, EditClientModal, NewOrderModal, NewGoalModal, GenerateReportModal) — replace supabase insert/update with api.post/put()
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.31** Migrate `src/components/reports/` (2 files: RecentReports, ReportWorkflow) — replace supabase queries with api.get/post()
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.32** Migrate `src/components/ai/AICopilot.tsx`, `src/components/ai-growth-engine/AIInsightsCenter.tsx`, `src/components/ai-growth-engine/AIDraftMessageModal.tsx` — replace `supabase.auth.getSession()` + supabase queries with api calls
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.33** Migrate `src/components/onboarding/OnboardingWizard.tsx`, `src/components/onboarding/steps/DetailsStep.tsx`, `src/components/onboarding/types.ts` — replace supabase queries, storage calls, and rpc calls with api calls. Replace Database type import with inline types.
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.34** Migrate `src/components/risk-profiling/ClientRiskProfileTab.tsx`, `RiskProfilingWizard.tsx`, `types.ts` — replace supabase queries and Database type imports with api calls and inline types
  - `@agent: domain-migrator`
  - `@parallel: A`

- [x] **A.35** Migrate `src/components/portfolio-admin/PortfolioAIInsightsPanel.tsx` — replace `supabase.functions.invoke()` with api.post()
  - `@agent: domain-migrator`
  - `@parallel: A`

---

## Phase B: Build Verification (after ALL Phase A tasks complete)

- [x] **B.1** Run `npm run build` — capture and fix any TypeScript compilation errors introduced by Supabase removal
  - `@agent: build-verifier`
  - `@parallel: B` (sequential)

- [x] **B.2** Run `npx tsc --noEmit` — fix any type errors not caught by the build
  - `@agent: build-verifier`
  - `@parallel: B` (after B.1)

- [x] **B.3** Delete `src/integrations/supabase/` directory (client.ts + types.ts). Verify no remaining imports reference it with `grep -r "supabase" src/`
  - `@agent: build-verifier`
  - `@parallel: B` (after B.2)

- [x] **B.4** Final validation: `npm run build` succeeds AND `python -c "import app.main"` succeeds. Report any remaining issues.
  - `@agent: build-verifier`
  - `@parallel: B` (after B.3)

---

## Dependencies & Parallelization Summary

```
Phase A (5 agents in parallel):
├── backend-fixer: A.1 → A.2 → A.3 → A.4 → A.5
├── page-migrator: A.6, A.7, A.8, A.9, A.10, A.11, A.12 (all parallel within agent)
├── dashboard-migrator: A.13, A.14, A.15, A.16, A.17, A.18 (all parallel within agent)
├── client-migrator: A.19, A.20, A.21, A.22, A.23, A.24 (all parallel within agent)
└── domain-migrator: A.25-A.35 (all parallel within agent)

Phase B (1 agent, sequential, after ALL of Phase A):
└── build-verifier: B.1 → B.2 → B.3 → B.4
```

## Agent Assignment Summary

| Agent | Tasks | Files Touched |
|---|---|---|
| `backend-fixer` | A.1-A.5 | 10 Python files |
| `page-migrator` | A.6-A.12 | 14 .tsx files |
| `dashboard-migrator` | A.13-A.18 | 13 .tsx files |
| `client-migrator` | A.19-A.24 | 12 .tsx files |
| `domain-migrator` | A.25-A.35 | 28 .tsx/.ts files |
| `build-verifier` | B.1-B.4 | Fix-up + delete 2 files |
| **Total** | **35 tasks** | **~79 files** |
