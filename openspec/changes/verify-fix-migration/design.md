# Design: verify-fix-migration

## 1. Backend `metadata` Column Rename

### Problem
SQLAlchemy's Declarative API reserves `metadata` as a class attribute (it points to `MetaData`). Five model classes define a column named `metadata`, crashing the import chain.

### Solution
Rename the Python attribute to `extra_data` while keeping the database column name as `metadata` via `mapped_column(..., name="metadata")`. This is the least disruptive approach — the DB schema stays unchanged, only the Python attribute name changes.

```python
# Before (crashes)
metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

# After (works)
extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
```

### Affected Files

| File | Classes | Lines |
|---|---|---|
| `app/models/chat.py` | Conversation, Message | 53, 86 |
| `app/models/communication.py` | CommunicationLog | 62 |
| `app/models/client.py` | ClientActivity | 192 |
| `app/models/lead.py` | LeadActivity | 101 |

### Downstream References to Update

| File | Usage | Change |
|---|---|---|
| `app/schemas/chat.py` | `metadata: dict \| None` field | Rename to `extra_data` |
| `app/schemas/lead.py` | `metadata` field | Rename to `extra_data` |
| `app/api/websocket/chat.py` | `metadata={}` on message saves | Change to `extra_data={}` |
| `app/agents/memory.py` | `metadata=metadata or {}` | Change to `extra_data=...` |
| `app/agents/orchestrator.py` | `context.metadata` | This is `AgentContext.metadata`, NOT the DB field — no change needed |
| `app/agents/base_agent.py` | `AgentContext.metadata` | This is a dataclass dict, NOT the DB field — no change needed |

## 2. Frontend Supabase Migration Strategy

### Pattern Mapping

Every `supabase.from('table').select().eq().order()` call maps to an `api.get()` call:

```typescript
// Before
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('advisor_id', advisorId)
  .order('created_at', { ascending: false });
if (error) throw error;
return data;

// After
const data = await api.get<any[]>('/clients/', { advisor_id: advisorId });
return data;
```

### Supabase → API Endpoint Mapping

| Supabase Table | API Endpoint | Notes |
|---|---|---|
| `clients` | `/clients/` | CRUD via clientService |
| `client_aum` | `/clients/aum` | Part of client endpoints |
| `client_activities` | `/clients/{id}/activities` | |
| `client_life_goals` | `/goals/` | |
| `client_family_members` | `/clients/{id}/family` | |
| `client_documents` | `/clients/{id}/documents` | |
| `client_notes` | `/clients/{id}/notes` | |
| `client_reminders` | `/clients/{id}/reminders` | |
| `client_tags` | `/clients/{id}/tags` | |
| `client_consents` | `/clients/{id}/consents` | |
| `orders` | `/orders/` | CRUD via orderService |
| `payments`, `invoices` | `/orders/payments`, `/orders/invoices` | |
| `portfolio_admin_*` | `/portfolios/` | Via portfolioService |
| `leads`, `lead_activities` | `/leads/` | Via leadService |
| `communication_logs` | `/communications/` | |
| `communication_campaigns`, `campaign_*` | `/campaigns/` | Via campaignService |
| `message_templates` | `/communications/templates` | |
| `compliance_alerts`, `advice_records` | `/compliance/` | Via complianceService |
| `funding_*`, `cash_balances`, `payout_*` | `/funding/` | Via fundingService |
| `corporate_actions` | `/corporate-actions/` | |
| `tasks` | `/admin/tasks` | General task management |
| `reports` | `/reports/` | |
| `risk_profiles`, `risk_answers` | `/compliance/risk-profiles` | |
| `profiles` | `/auth/me` or `/clients/profile` | |

### Special Cases

1. **`supabase.auth.getSession()`** — Replace with `api.getAccessToken()` from `src/services/api.ts`. Components currently using this to get the bearer token for edge function calls should use the api client directly.

2. **`supabase.functions.invoke()`** — These call Supabase Edge Functions (AI features). Replace with `api.post('/insights/...')` calls to equivalent FastAPI endpoints. The 3 affected files:
   - `useCampaignAI.ts` (6 calls) → `api.post('/insights/campaign-ai', {...})`
   - `PortfolioAIInsightsPanel.tsx` (1 call) → `api.post('/insights/portfolio', {...})`
   - `Funding.tsx` (1 call) → `api.post('/funding/analyze', {...})`

3. **`supabase.storage`** — Used for document uploads/downloads in `ClientDocumentsTab.tsx` and `OnboardingWizard.tsx`. Replace with file upload endpoints: `api.post('/clients/{id}/documents/upload', formData)`. For now, stub with a TODO comment since file upload endpoint doesn't exist yet.

4. **`supabase.rpc('check_client_duplicates')`** — Replace with `api.post('/clients/check-duplicates', {...})`.

5. **`Database['public']['Tables']['table_name']['Row']` types** — Replace with inline type definitions or `any` (these will be properly typed when the OpenAPI type generation pipeline is run in a future task).

## 3. Parallel Execution Strategy

```
Phase A (launch simultaneously):
├── backend-fixer: Fix 5 metadata columns + 5 downstream files → verify import
├── page-migrator: Migrate 14 page files
├── dashboard-migrator: Migrate 13 dashboard component files
├── client-migrator: Migrate 12 client component files
└── domain-migrator: Migrate 28 remaining component files

Phase B (after Phase A):
└── build-verifier: Run npm run build + python import + delete supabase dir + fix errors
```
