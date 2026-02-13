# Project Context

## Purpose
Wealth Navigator AI is a comprehensive wealth management platform for financial advisors. It provides portfolio management, client relationship management, compliance tracking, lead pipeline management, marketing campaigns, and AI-powered insights to help wealth advisors manage their practice end-to-end. The platform emphasizes data-driven decision-making with AI copilot features, churn prediction, engagement scoring, and automated rebalancing.

## Tech Stack
- **Language**: TypeScript (strict mode disabled for `noImplicitAny`, `strictNullChecks`)
- **Framework**: React 18 with React Router v6 (SPA, client-side routing)
- **Build Tool**: Vite 5 with SWC plugin (`@vitejs/plugin-react-swc`)
- **Styling**: Tailwind CSS 3 with `tailwindcss-animate`, custom theme via CSS variables (HSL)
- **UI Components**: shadcn/ui (Radix UI primitives underneath)
- **Icons**: lucide-react
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Query (TanStack Query v5) for server state, React Context for auth
- **Backend**: Supabase (PostgreSQL, Auth, Row-Level Security)
- **Date Handling**: date-fns
- **Testing**: Vitest + @testing-library/react + jsdom
- **Linting**: ESLint 9 (flat config) with react-hooks and react-refresh plugins

## Project Conventions

### Code Style
- **File naming**: PascalCase for components (`ClientProfile.tsx`), camelCase for hooks (`useChurnPredictions.ts`), camelCase for utilities (`currency.ts`)
- **Component style**: Functional components with arrow functions (`const Component = () => { ... }`)
- **Import aliasing**: `@/` maps to `src/` (configured in Vite and tsconfig)
- **CSS**: Tailwind utility classes; use `cn()` from `@/lib/utils` for conditional class merging
- **Exports**: Default exports for pages, named exports for hooks and utilities
- **Types**: Prefer interfaces for component props; use auto-generated Supabase types from `@/integrations/supabase/types`

### Architecture Patterns
- **Feature folders**: Components grouped by domain under `src/components/{feature}/` (e.g., `campaigns/`, `portfolio-admin/`, `clients/`)
- **Page composition**: Pages in `src/pages/` compose feature components, handle routing params, and manage top-level state
- **Data hooks**: Custom hooks in `src/hooks/` encapsulate React Query calls to Supabase (e.g., `useBusiness`, `useChurnPredictions`)
- **Context layer**: Minimal use of React Context; only `AuthContext` for authentication/authorization
- **Data flow**: `User Action -> Component -> Custom Hook -> React Query -> Supabase Client -> PostgreSQL`
- **UI layer**: shadcn/ui components in `src/components/ui/` are kept as-is; business UI built on top in feature folders
- **Layout**: Shared `MainLayout` with collapsible sidebar, applied in routing

### Testing Strategy
- **Framework**: Vitest with jsdom environment
- **Libraries**: @testing-library/react for component tests, @testing-library/jest-dom for assertions
- **Commands**: `npm run test` (single run), `npm run test:watch` (watch mode)
- **Test location**: `src/test/` directory
- **Current coverage**: Minimal (example test only); new features should include unit tests for business logic hooks and integration tests for key workflows

### Git Workflow
- **Branch**: `main` is the primary branch
- **Commit style**: Short descriptive messages (e.g., "Add AI Insights panel", "Add model portfolio management")
- **Co-authoring**: Include `Co-Authored-By` when AI-assisted

## Domain Context
This is a **wealth management / financial advisory** platform. Key domain concepts:

- **AUM (Assets Under Management)**: Total market value of assets an advisor manages for clients. Tracked per client and aggregated across the practice.
- **Portfolio**: A collection of investment positions (equity, debt, other) belonging to a client. Has target allocations and risk profiles.
- **Rebalancing**: Adjusting portfolio positions to match target allocation. Involves drift detection (threshold-based), trade generation, tax impact estimation (long-term vs short-term capital gains), and transaction cost estimation (brokerage, STT, GST).
- **Cost Basis Accounting**: Tracking purchase lots for tax reporting. Supports FIFO, LIFO, Average Cost, and Specific Identification methods.
- **Risk Profiling**: Questionnaire-based assessment of client risk tolerance, resulting in categories like Conservative, Moderate, Aggressive.
- **Lead Pipeline**: Sales funnel with stages (New -> Contacted -> Meeting -> Proposal -> Closed Won / Lost). Includes scoring, probability, and revenue forecasting.
- **Churn Prediction**: Multi-factor risk scoring (0-100) based on interaction recency, SIP status, engagement score, campaign response, and revenue trends.
- **Engagement Scoring**: Composite metric measuring client interaction frequency, communication opens/clicks, and task completion.
- **Compliance**: Advice records, audit trails, communication logs, consent management per financial regulatory requirements.
- **SIP (Systematic Investment Plan)**: Recurring investment commitment by a client.
- **Corporate Actions**: Events like dividends, splits, bonuses that affect portfolio positions.
- **Model Portfolio**: Template portfolios that can be applied to multiple client accounts.

## Important Constraints
- **Financial data accuracy**: All calculations (AUM, gains/losses, tax impacts, transaction costs) must be precise. Use proper decimal handling.
- **Regulatory compliance**: Features must support audit trails and record-keeping requirements for financial advisory.
- **Row-Level Security**: Supabase RLS policies enforce data isolation between advisors. Always filter queries by `advisor_id` or authenticated user.
- **Role-based access**: Three roles exist: `wealth_advisor`, `compliance_officer`, `client`. UI and data access vary by role.
- **Client-side only**: No custom backend server; all business logic runs in the browser or via Supabase edge functions and database triggers.
- **TypeScript relaxed mode**: `noImplicitAny: false` and `strictNullChecks: false` are set; do not introduce stricter settings without discussion.

## External Dependencies
- **Supabase** (PostgreSQL + Auth + Realtime): Primary backend. Project ID: `auveypqsxlbuoqhvasim`. Handles authentication, database, and RLS.
- **Lovable**: Development platform integration (`lovable-tagger` dev dependency). Used for AI-assisted development workflows.
- **Recharts**: Data visualization library for portfolio charts, performance graphs, and business dashboards.
- **Radix UI**: Headless component primitives underlying all shadcn/ui components.
- **React Query**: Server state management with caching, automatic refetching, and optimistic updates.
