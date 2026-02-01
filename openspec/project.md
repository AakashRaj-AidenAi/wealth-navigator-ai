# Project Context

## Purpose
WealthOS is an enterprise-grade wealth management platform designed for HNI/UHNI clients, wealth advisors, compliance officers, and family offices. The platform provides comprehensive portfolio management, client relationship management, compliance tracking, and AI-powered insights to enhance wealth advisory services.

## Tech Stack

### Frontend
- **Vite** (v5.4.19) - Build tool and dev server
- **React** (v18.3.1) - UI library
- **TypeScript** (v5.8.3) - Type safety
- **React Router DOM** (v6.30.1) - Client-side routing

### UI & Styling
- **shadcn/ui** - Headless component library (Radix UI based)
- **Tailwind CSS** (v3.4.17) - Utility-first CSS with dark mode
- **Lucide React** - Icon library
- **Recharts** - Data visualization

### State Management
- **TanStack React Query** (v5.83.0) - Server state
- **React Hook Form** (v7.61.1) - Form state
- **Zod** - Schema validation
- **React Context** - Auth and global state

### Backend & Database
- **Supabase** - PostgreSQL, authentication, real-time features
- **Edge Functions** - Serverless API (portfolio-copilot, ai-insights, ai-growth-engine, smart-prioritization, corporate-actions)

### Development Tools
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **ESLint** - Code linting
- **SWC** - Fast JavaScript compiler
- **Bun** - Package manager

## Project Conventions

### Code Style
- **TypeScript strict mode** - All code must be properly typed
- **Path aliases** - Use `@/` for imports from `src/` (e.g., `@/components/ui/button`)
- **Component structure** - One component per file, co-locate related components
- **Naming conventions**:
  - Components: PascalCase (`ClientProfile.tsx`)
  - Hooks: camelCase with `use` prefix (`use-toast.ts`)
  - Utilities: camelCase (`utils.ts`)
  - Constants: SCREAMING_SNAKE_CASE

### Architecture Patterns
- **Feature-based organization** - Components grouped by domain (clients, portfolio, compliance, etc.)
- **Container/Presentation split** - Pages handle data fetching, components handle rendering
- **Context for global state** - Auth, theme managed via React Context
- **React Query for server state** - API calls use TanStack Query with proper caching
- **Form handling** - React Hook Form + Zod for validation
- **Protected routes** - `ProtectedRoute` wrapper for authenticated pages

### Component Patterns
- **shadcn/ui base** - All UI primitives from `@/components/ui/`
- **Composition over configuration** - Build complex UIs from simple components
- **Accessible by default** - Radix UI ensures WAI-ARIA compliance
- **Dark mode first** - Design for dark theme, support light

### Testing Strategy
- **Framework**: Vitest with jsdom environment
- **Location**: Tests in `src/**/*.{test,spec}.{ts,tsx}`
- **Libraries**: @testing-library/react for component tests
- **Run tests**: `npm test` (once) or `npm run test:watch` (watch mode)
- **Coverage**: Focus on business logic and user interactions

### Git Workflow
- **Branch naming**: `feature/`, `fix/`, `refactor/` prefixes
- **Commit style**: Conventional commits (feat:, fix:, chore:, etc.)
- **PR process**: Create proposal for significant changes via OpenSpec

## Domain Context

### User Roles
- **Wealth Advisor** - Primary users managing client portfolios and relationships
- **Compliance Officer** - Monitors regulatory adherence, audits, risk management
- **Client** - End users viewing their own portfolio and goals

### Key Entities
- **Clients** - HNI/UHNI individuals with KYC, family members, nominees, documents
- **Portfolios** - Investment holdings, asset allocation, performance tracking
- **Goals** - Client financial objectives with progress tracking
- **Corporate Actions** - Dividends, splits, mergers affecting holdings
- **Leads** - Prospective clients in sales pipeline
- **Tasks** - Action items for advisors and compliance

### Client Tags
- HNI, UHNI - Net worth classification
- Prospect, Active, Dormant - Lifecycle status
- VIP, NRI - Special handling flags

## Important Constraints

### Security & Compliance
- **PII protection** - Client data (PAN, Aadhar) must be handled securely
- **Role-based access** - Users only see data appropriate to their role
- **Audit trails** - All significant actions must be logged
- **Document expiry** - Track and alert on expiring KYC documents

### Performance
- **Dashboard load time** - Target under 3 seconds
- **Real-time updates** - Use Supabase subscriptions for live data
- **Lazy loading** - Code-split routes for faster initial load

### Regulatory
- **KYC compliance** - Complete client verification required
- **Data residency** - Consider data storage location requirements
- **Audit readiness** - Maintain complete activity history

## External Dependencies

### Supabase Services
- **URL**: `https://auveypqsxlbuoqhvasim.supabase.co`
- **Features used**: Auth, Database, Edge Functions, Storage, Realtime

### Edge Functions
| Function | Purpose |
|----------|---------|
| `portfolio-copilot` | AI-powered portfolio analysis and recommendations |
| `ai-insights` | Generate investment insights from market data |
| `ai-growth-engine` | Client engagement suggestions, meeting summaries |
| `smart-prioritization` | Task and client priority scoring |
| `corporate-actions` | Track and analyze corporate events |

### Third-Party Integrations
- **Lovable** - UI generation platform (auto-commits enabled)
