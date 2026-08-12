# BizPilot

**Your business should improve every day.**

BizPilot is an adaptive, real-time Business Growth & Operations Copilot designed to help businesses understand their performance, track progress, and make data-driven decisions. Built on a solid foundation of real data and honest intelligence, BizPilot provides Day 1 utility while architected for future AI-powered adaptive capabilities.

## Product Overview

### Core Value Proposition

- **Real Data, Not Demos:** All insights are derived from your actual business data
- **Fast & Responsive:** Real-time metrics and dashboards for immediate visibility
- **Smart & Adaptive:** Foundation ready for AI-powered recommendations and strategies
- **Multi-Tenant & Secure:** Complete business data isolation with Manus OAuth authentication

### Key Features (Day 1)

1. **Business Onboarding:** Setup your business profile with industry, type, goals, and automatic demo data seeding
2. **Core Data Management:** Full CRUD operations for Customers, Products, Transactions, and Expenses
3. **CSV Import Pipeline:** Import data with column mapping, validation preview, and error reporting
4. **Business Dashboard:** Real-time health metrics (revenue, expenses, profit, transactions, customers)
5. **Business Goals Tracking:** Set and prioritize business objectives
6. **Data Source Freshness:** Monitor data source status and reliability
7. **TODAY Concept Foundation:** Placeholder for future real-time signals (market changes, opportunities, recommendations)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Tailwind CSS 4, TypeScript |
| **Backend** | Express 4, Node.js, tRPC 11 |
| **Database** | MySQL/TiDB with Drizzle ORM |
| **Authentication** | Manus OAuth 2.0 |
| **API** | tRPC with end-to-end type safety |
| **Testing** | Vitest |
| **Deployment** | Manus WebDev (Autoscale/Cloud Run) |

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Manus OAuth user accounts |
| `businesses` | Business profiles (multi-tenant) |
| `businessGoals` | Business objectives and priorities |
| `customers` | Customer records |
| `products` | Product/service catalog |
| `transactions` | Revenue transactions |
| `expenses` | Operating expenses |
| `businessEvents` | Event audit trail for future analytics |
| `recommendations` | AI-generated recommendations (future) |
| `strategies` | Business strategies (future) |
| `outcomes` | Strategy outcomes tracking (future) |
| `externalDataSources` | External data source metadata |
| `csvImports` | CSV import history and metadata |

### External Data Source Schema

All external data sources include:
- **SOURCE:** Origin of the data (API, webhook, file, etc.)
- **TIMESTAMP:** When the data was last updated
- **FRESHNESS:** Freshness level (live, near-real-time, periodic, historical)
- **RELIABILITY:** Confidence score (0-100)
- **PROVENANCE:** Data lineage and transformation history

## Authentication Flow

1. User navigates to `/auth`
2. Clicks "Sign In with Manus"
3. Redirected to Manus OAuth portal
4. After authentication, redirected to `/api/oauth/callback`
5. Session cookie created (`manus-session`)
6. User redirected to `/onboarding` (new) or `/dashboard` (returning)
7. All API calls include session context via `ctx.user`

### Protected Routes

All routes except `/auth` require authentication via `useAuth()` hook:

```tsx
const { user, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: true });
```

## CSV Import Process

### Supported Data Types

- **Customers:** name, email, phone, company
- **Products:** name, type (product/service), price, cost
- **Transactions:** amount, date, description, type
- **Expenses:** category, amount, date, description

### Import Workflow

1. **Upload:** Select data type and CSV file
2. **Map:** Assign CSV columns to database fields
3. **Preview:** Review first 5 rows with mapped columns
4. **Import:** Execute row-by-row import with error handling
5. **Summary:** View success/failure counts and error details

## API Documentation

### tRPC Procedures

All procedures are type-safe with Zod validation. Access via `trpc.*` hooks:

```tsx
const { data, isLoading } = trpc.business.list.useQuery();
const mutation = trpc.customers.create.useMutation();
```

### Available Routers

| Router | Procedures |
|--------|-----------|
| `auth` | `me`, `logout` |
| `business` | `create`, `list`, `get`, `update` |
| `businessGoals` | `create`, `list` |
| `customers` | `create`, `list`, `get`, `update`, `delete` |
| `products` | `create`, `list`, `get`, `update`, `delete` |
| `transactions` | `create`, `list`, `get`, `delete` |
| `expenses` | `create`, `list`, `get`, `delete` |
| `metrics` | `getBusinessMetrics` |
| `events` | `create`, `list` |
| `recommendations` | `create`, `list` |
| `strategies` | `create`, `list` |
| `externalDataSources` | `create`, `list` |

## Environment Variables

### System-Provided (Auto-Injected)

- `DATABASE_URL` - MySQL/TiDB connection string
- `JWT_SECRET` - Session cookie signing secret
- `VITE_APP_ID` - Manus OAuth application ID
- `OAUTH_SERVER_URL` - Manus OAuth backend URL
- `VITE_OAUTH_PORTAL_URL` - Manus login portal URL
- `OWNER_OPEN_ID`, `OWNER_NAME` - Owner information
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` - Manus built-in APIs

### Optional (User-Configured)

- `VITE_APP_TITLE` - Website title (default: "BizPilot")
- `VITE_APP_LOGO` - Website logo URL

## Current Limitations

### Day 1 Scope

1. **Demo Analysis Only:** AI analysis is placeholder/demo. No real LLM integration yet.
2. **No Real-Time Signals:** TODAY section is empty. Market/competitor intelligence not available.
3. **No Webhooks:** External data sources are manual only.
4. **No Scheduled Jobs:** Periodic data refresh not implemented.
5. **Single Business Per User:** Users can create multiple businesses but no team/multi-user business support.
6. **CSV Only:** No direct API integrations for data import.
7. **No Audit Logging:** Business events are tracked but not fully utilized.
8. **No Notifications:** No email/push notifications for alerts.

### Planned Removals/Changes

- Demo data seeding will be optional in future versions
- CSV import will be supplemented with API connectors
- TODAY section will populate with real market signals
- AI analysis will integrate real LLM providers

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL/TiDB database

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm check

# Format code
pnpm format
```

### Database Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations (via webdev_execute_sql in production)
pnpm db:push
```

## Deployment

### Manus WebDev Deployment

1. Create checkpoint: `webdev_save_checkpoint`
2. Click "Publish" in Management UI
3. Select hosting mode (Autoscale or Reserved)
4. Configure custom domain if needed

### Environment Setup

All secrets are auto-injected by Manus. No `.env` file needed in production.

## Architecture Decisions

### Multi-Tenant Isolation

- Each business is owned by a user
- All queries filtered by `businessId`
- Backend procedures accept `businessId` and validate ownership

### Type Safety

- tRPC provides end-to-end type safety
- Zod validation on all inputs
- TypeScript strict mode enabled

### Demo Data Strategy

- Seeded during onboarding for immediate exploration
- Clearly labeled as "DEMO DATA" in UI
- Can be replaced with real data via CSV import

### AI Service Abstraction

- `AIService` → `ProviderAdapter` → `LLM` pattern
- Day 1: Demo provider (no fake responses)
- Future: Swappable providers (OpenAI, Anthropic, etc.)

## V1-V11 Roadmap

### V1 (Current - Day 1)
- Core data management (CRUD)
- CSV import pipeline
- Business dashboard with real metrics
- Manus OAuth authentication
- Demo analysis layer

### V2 - Real-Time Data
- Webhook support for live data feeds
- Scheduled data refresh jobs
- Real-time metric updates
- Data freshness indicators

### V3 - LLM Integration
- OpenAI/Anthropic provider integration
- Real AI-powered analysis
- Personalized recommendations
- Strategy generation

### V4 - Market Intelligence
- External market data sources
- Competitor tracking
- Industry benchmarks
- Trend analysis

### V5 - Notifications & Alerts
- Email notifications
- Push alerts for key metrics
- Custom alert rules
- Alert history

### V6 - Team Collaboration
- Multi-user business support
- Role-based access control
- Shared dashboards
- Audit logging

### V7 - Advanced Analytics
- Predictive analytics
- Forecasting
- Cohort analysis
- Custom reports

### V8 - Integrations
- Stripe payments integration
- Shopify storefront
- Slack notifications
- Zapier/Make.com support

### V9 - Mobile App
- Native iOS/Android apps
- Offline mode
- Push notifications
- Mobile-optimized dashboards

### V10 - Enterprise Features
- SSO (SAML/OAuth)
- Advanced security
- Data export/compliance
- SLA support

### V11 - Adaptive Intelligence
- Machine learning models
- Anomaly detection
- Automated recommendations
- Continuous learning

## Contributing

This is a Manus-built project. For questions or feedback, please use the Manus feedback portal.

## License

Proprietary - BizPilot

---

**Built with ❤️ by Manus**

Last Updated: August 2026
