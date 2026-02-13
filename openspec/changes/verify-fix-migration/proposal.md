# Proposal: verify-fix-migration

## Summary

The `migrate-to-fastapi-ai-platform` change created a complete FastAPI backend (90 Python files) and a new frontend service layer, but the codebase cannot run yet:

1. **Backend crash on startup** — 5 SQLAlchemy model columns named `metadata` conflict with the Declarative API reserved attribute, blocking `import app.main`.
2. **77 frontend component files** still import `supabase` client and call `supabase.from()` (141 calls), `supabase.auth.getSession()` (15 calls), `supabase.functions.invoke()` (8 calls), `supabase.storage` (4 calls), and `supabase.rpc()` (1 call). These compile today but will fail at runtime without Supabase env vars.
3. **14 files** import Supabase-generated `Database` types that need replacement.
4. The `src/integrations/supabase/` directory (client.ts + 103KB types.ts) should be deleted once all references are removed.

The frontend build (`npm run build`) currently passes and TypeScript (`tsc --noEmit`) reports zero errors, so the new code is structurally sound — only the old Supabase wiring remains.

## Scope

| Work Stream | Files | Blocking? |
|---|---|---|
| Backend: rename reserved `metadata` columns + verify startup | 10 Python files | Yes — server cannot start |
| Frontend: migrate 77 component files from `supabase.from()` to `api.get/post` | 77 .tsx/.ts files | Yes — runtime failure |
| Frontend: replace 14 Supabase type imports | 14 .tsx/.ts files | Yes — runtime failure |
| Frontend: delete `src/integrations/supabase/` | 2 files | Cleanup |
| Build verification: `npm run build` + `python -c "import app.main"` | 0 new files | Validation |

## Agent Team

| Agent ID | Type | Model | Specialty | Task Count |
|---|---|---|---|---|
| `backend-fixer` | `general-purpose` | `opus` | SQLAlchemy model fixes, Python import validation, server startup | 5 |
| `page-migrator` | `general-purpose` | `opus` | Migrate `src/pages/*.tsx` from Supabase to API service calls | 14 |
| `dashboard-migrator` | `general-purpose` | `opus` | Migrate `src/components/dashboard/*.tsx` from Supabase | 13 |
| `client-migrator` | `general-purpose` | `opus` | Migrate `src/components/clients/*.tsx` from Supabase | 12 |
| `domain-migrator` | `general-purpose` | `opus` | Migrate leads, campaigns, compliance, comms, tasks, modals, reports, onboarding, risk, portfolio-admin, ai components | 28 |
| `build-verifier` | `general-purpose` | `sonnet` | Run builds, fix TS errors, delete Supabase directory, final validation | 4 |

## Risks

- **Supabase type removals may break component props** — some components use `Database['public']['Tables']['clients']['Row']` as prop types. These need replacement with inline types or imports from the new service layer.
- **`supabase.auth.getSession()` calls in components** bypass AuthContext — these must be replaced with the `useAuth()` hook or `api.getAccessToken()`.
- **`supabase.storage` and `supabase.functions.invoke()`** have no direct backend equivalent yet — these need stubs or new API endpoints.
- **Column rename from `metadata` to `extra_data`** requires updating all Python code that reads/writes that field (schemas, API routes, WebSocket handler, memory manager).

## Out of Scope

- Adding new features or endpoints
- Writing E2E / Playwright tests (covered by a future change)
- Deploying or running the full stack with a real database
- Performance optimization
