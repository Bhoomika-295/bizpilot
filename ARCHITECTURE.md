# BizPilot — Architecture & Design Document

## System Overview

BizPilot is a multi-tenant business intelligence platform architected for real-time data analysis and future adaptive AI capabilities. The system is designed with clean separation of concerns, type safety, and extensibility in mind.

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                      │
│  Dashboard | Data Management | CSV Import | Onboarding      │
└─────────────────────────────────────────────────────────────┘
                            ↓ tRPC
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (tRPC 11)                        │
│  Type-safe procedures with Zod validation                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Business Logic Layer (Express)                  │
│  AIService | Metrics | Events | Recommendations             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         Data Access Layer (Drizzle ORM)                      │
│  Query builders with type safety                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              MySQL/TiDB Database                             │
│  13 tables with multi-tenant isolation                       │
└─────────────────────────────────────────────────────────────┘
```

## Database Architecture

### Schema Design Principles

1. **Multi-Tenant Isolation:** Every table includes `businessId` as a foreign key
2. **Audit Trail:** All tables include `createdAt` and `updatedAt` timestamps
3. **Soft Deletes:** Logical deletion via status field (not physical deletion)
4. **Type Safety:** Drizzle ORM generates TypeScript types from schema
5. **Relationships:** Proper foreign keys with cascade rules

### Core Tables

#### User Management

```
users
├── id (PK)
├── openId (unique, from Manus OAuth)
├── name
├── email
├── role (enum: user, admin)
├── createdAt
└── updatedAt
```

#### Business Profile

```
businesses
├── id (PK)
├── userId (FK → users)
├── name
├── industry
├── type (enum: sole_proprietor, partnership, corporation, nonprofit)
├── country
├── currency
├── size (enum: 1-10, 11-50, 51-200, 200+)
├── employees
├── isDemo (boolean)
├── status (enum: active, inactive)
├── createdAt
└── updatedAt
```

#### Business Goals

```
businessGoals
├── id (PK)
├── businessId (FK → businesses)
├── title
├── description
├── category (enum: revenue, efficiency, growth, customer, innovation)
├── priority (integer)
├── targetValue
├── targetDate
├── status (enum: active, achieved, abandoned)
├── createdAt
└── updatedAt
```

#### Core Data Entities

```
customers
├── id (PK)
├── businessId (FK → businesses)
├── name
├── email
├── phone
├── company
├── status (enum: active, inactive)
├── createdAt
└── updatedAt

products
├── id (PK)
├── businessId (FK → businesses)
├── name
├── type (enum: product, service)
├── price
├── cost
├── status (enum: active, inactive)
├── createdAt
└── updatedAt

transactions
├── id (PK)
├── businessId (FK → businesses)
├── amount
├── type (enum: sale, refund, adjustment)
├── description
├── transactionDate
├── status (enum: pending, completed, failed)
├── createdAt
└── updatedAt

expenses
├── id (PK)
├── businessId (FK → businesses)
├── category
├── amount
├── description
├── expenseDate
├── status (enum: pending, completed, reimbursed)
├── createdAt
└── updatedAt
```

#### Intelligence Foundation

```
businessEvents
├── id (PK)
├── businessId (FK → businesses)
├── eventType (enum: data_import, metric_change, goal_update, analysis_run)
├── eventData (JSON)
├── severity (enum: info, warning, critical)
├── createdAt
└── updatedAt

recommendations
├── id (PK)
├── businessId (FK → businesses)
├── title
├── description
├── category
├── evidence
├── confidence (0-100)
├── assumptions (JSON array)
├── expectedImpact
├── risk
├── source (enum: demo, llm, user)
├── status (enum: pending, accepted, rejected, implemented)
├── createdAt
└── updatedAt

strategies
├── id (PK)
├── businessId (FK → businesses)
├── objective
├── targetMetric
├── baseline
├── proposedActions (JSON array)
├── expectedOutcome
├── timeframe
├── assumptions (JSON array)
├── risks (JSON array)
├── confidence (0-100)
├── source (enum: demo, llm, user)
├── status (enum: draft, active, completed, abandoned)
├── createdAt
└── updatedAt

outcomes
├── id (PK)
├── strategyId (FK → strategies)
├── businessId (FK → businesses)
├── actualResult
├── variance
├── completionDate
├── notes
├── createdAt
└── updatedAt
```

#### Infrastructure

```
externalDataSources
├── id (PK)
├── businessId (FK → businesses)
├── name
├── source (enum: api, webhook, file, database)
├── url
├── lastSyncedAt
├── freshness (enum: live, near_realtime, periodic, historical)
├── reliability (0-100)
├── provenance (JSON - data lineage)
├── status (enum: connected, pending, error)
├── createdAt
└── updatedAt

csvImports
├── id (PK)
├── businessId (FK → businesses)
├── fileName
├── dataType (enum: customers, products, transactions, expenses)
├── rowsProcessed
├── rowsSuccessful
├── rowsFailed
├── mappingConfig (JSON)
├── status (enum: pending, processing, completed, failed)
├── createdAt
└── updatedAt
```

## API Architecture

### tRPC Router Structure

```
appRouter
├── auth
│   ├── me (query)
│   └── logout (mutation)
├── business
│   ├── create (mutation)
│   ├── list (query)
│   ├── get (query)
│   └── update (mutation)
├── businessGoals
│   ├── create (mutation)
│   └── list (query)
├── customers
│   ├── create (mutation)
│   ├── list (query)
│   ├── get (query)
│   ├── update (mutation)
│   └── delete (mutation)
├── products
│   ├── create (mutation)
│   ├── list (query)
│   ├── get (query)
│   ├── update (mutation)
│   └── delete (mutation)
├── transactions
│   ├── create (mutation)
│   ├── list (query)
│   ├── get (query)
│   └── delete (mutation)
├── expenses
│   ├── create (mutation)
│   ├── list (query)
│   ├── get (query)
│   └── delete (mutation)
├── metrics
│   └── getBusinessMetrics (query)
├── events
│   ├── create (mutation)
│   └── list (query)
├── recommendations
│   ├── create (mutation)
│   └── list (query)
├── strategies
│   ├── create (mutation)
│   └── list (query)
└── externalDataSources
    ├── create (mutation)
    └── list (query)
```

### Procedure Types

- **publicProcedure:** No authentication required
- **protectedProcedure:** Requires valid session (ctx.user)
- **adminProcedure:** Requires admin role (future)

## Authentication Architecture

### Manus OAuth Flow

```
1. User clicks "Sign In with Manus"
   ↓
2. Frontend redirects to OAUTH_SERVER_URL with:
   - client_id (VITE_APP_ID)
   - redirect_uri (/api/oauth/callback)
   - state (nonce for CSRF protection)
   ↓
3. User authenticates at Manus portal
   ↓
4. Manus redirects to /api/oauth/callback with:
   - code (authorization code)
   - state (verify against nonce)
   ↓
5. Backend exchanges code for token
   ↓
6. Backend creates session cookie (manus-session)
   ↓
7. User redirected to /dashboard or /onboarding
   ↓
8. All subsequent requests include session cookie
   ↓
9. ctx.user populated from session
```

### Session Management

- **Cookie Name:** `manus-session`
- **Signing Secret:** `JWT_SECRET`
- **Expiration:** 30 days (configurable)
- **Secure:** HTTPS only, SameSite=None
- **HttpOnly:** Not accessible from JavaScript

## AI Service Architecture

### AIService Layer

The AI service is designed with a clean abstraction to support multiple providers:

```
AIService (public interface)
├── analyzeBusinessData()
├── generateRecommendations()
├── generateStrategy()
└── runFullAnalysis()
    ↓
ILLMProvider (interface)
├── analyzeData()
├── generateRecommendations()
└── generateStrategy()
    ↓
Concrete Providers
├── DemoLLMProvider (Day 1)
├── OpenAIProvider (V3)
├── AnthropicProvider (V3)
└── CustomProvider (future)
```

### Provider Adapter Pattern

Each provider implements `ILLMProvider`:

```typescript
interface ILLMProvider {
  name: string;
  analyzeData(request: AnalysisRequest): Promise<AnalysisResult>;
  generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]>;
  generateStrategy(analysis: AnalysisResult): Promise<Strategy>;
}
```

### Day 1 Demo Provider

The `DemoLLMProvider` returns honest, placeholder responses:

- No fake AI analysis
- Clearly labeled as "demo"
- Lists assumptions and limitations
- Confidence score = 0
- Source marked as "demo"

### Future Provider Integration

To add a new provider (e.g., OpenAI):

1. Create `OpenAIProvider` implementing `ILLMProvider`
2. Add provider selection logic to `AIService` constructor
3. Update environment variables for API keys
4. No changes needed to business logic

## Frontend Architecture

### Component Structure

```
App.tsx (Router)
├── Home (landing page)
├── Auth (sign-in)
├── Onboarding (business setup)
├── Dashboard (main view)
│   ├── Business Briefing
│   ├── Health Metrics
│   ├── Business Goals
│   ├── Data Freshness
│   └── TODAY Section
├── DataManagement (CRUD)
│   ├── Customers Tab
│   ├── Products Tab
│   ├── Transactions Tab
│   └── Expenses Tab
└── CsvImport (import pipeline)
    ├── Upload Step
    ├── Map Step
    ├── Preview Step
    └── Complete Step
```

### State Management

- **Authentication:** `useAuth()` hook (global context)
- **Data Queries:** tRPC `useQuery()` hooks
- **Data Mutations:** tRPC `useMutation()` hooks
- **Local State:** React `useState()` for form data
- **Theme:** `ThemeContext` for dark/light mode

### Data Flow

```
User Action
    ↓
Component State Update
    ↓
tRPC Mutation/Query
    ↓
Backend Procedure
    ↓
Database Query
    ↓
Response → Cache Update
    ↓
Component Re-render
```

## Security Architecture

### Multi-Tenant Isolation

Every query includes `businessId` validation:

```typescript
// ✅ Correct: Validates ownership
const business = await db.query.businesses
  .findFirst({
    where: and(
      eq(businesses.id, businessId),
      eq(businesses.userId, ctx.user.id)
    )
  });

// ❌ Wrong: Missing ownership check
const business = await db.query.businesses
  .findFirst({
    where: eq(businesses.id, businessId)
  });
```

### Input Validation

All tRPC procedures use Zod schemas:

```typescript
export const createCustomerSchema = z.object({
  businessId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});
```

### Authentication Checks

- All protected routes require valid session
- Session cookie validated on every request
- User context (`ctx.user`) injected by middleware

## Deployment Architecture

### Manus WebDev Hosting

- **Runtime:** Node.js on Cloud Run
- **Scaling:** Autoscale (0-N instances) or Reserved (always-on)
- **Build:** Vite (frontend) + esbuild (backend)
- **Environment:** Auto-injected secrets
- **Database:** Managed MySQL/TiDB

### Build Process

```
1. Vite builds React frontend
   ↓
2. esbuild bundles Express server
   ↓
3. Docker image created
   ↓
4. Deployed to Cloud Run
   ↓
5. Environment variables injected
   ↓
6. Service starts listening on port 3000
```

### Cold Start Optimization

- Minimal dependencies
- Tree-shaking enabled
- Code splitting for frontend
- Lazy loading for routes

## Performance Considerations

### Database Optimization

- Indexes on `businessId`, `userId`, `createdAt`
- Connection pooling via Drizzle
- Query result caching via tRPC
- Pagination for large datasets

### Frontend Optimization

- Code splitting by route
- Image optimization
- CSS-in-JS (Tailwind) tree-shaking
- React lazy loading

### API Optimization

- tRPC batching for multiple queries
- Response compression
- Caching headers
- Rate limiting (future)

## Monitoring & Observability

### Logging

- Dev server logs: `.manus-logs/devserver.log`
- Browser console: `.manus-logs/browserConsole.log`
- Network requests: `.manus-logs/networkRequests.log`
- Session replay: `.manus-logs/sessionReplay.log`

### Metrics

- Business metrics calculated in `metrics.getBusinessMetrics()`
- Event logging via `businessEvents` table
- Data freshness tracked in `externalDataSources`

### Error Handling

- tRPC error codes (UNAUTHORIZED, NOT_FOUND, INTERNAL_SERVER_ERROR, etc.)
- Zod validation errors with field-level details
- User-friendly toast notifications

## Testing Strategy

### Unit Tests

- tRPC procedures: `server/*.test.ts`
- Database helpers: `server/db.test.ts`
- Utilities: `shared/*.test.ts`

### Integration Tests

- End-to-end flows (auth, onboarding, CSV import)
- Database transactions
- Multi-tenant isolation

### Test Framework

- **Vitest:** Fast unit test runner
- **Mocking:** Mock database queries
- **Fixtures:** Sample data for tests

## Future Extensibility

### Planned Additions

1. **Webhooks:** External data source integrations
2. **Scheduled Jobs:** Periodic data refresh
3. **Real LLM Providers:** OpenAI, Anthropic integration
4. **Market Intelligence:** External data feeds
5. **Notifications:** Email, Slack, push alerts
6. **Team Collaboration:** Multi-user businesses
7. **Advanced Analytics:** Predictive models
8. **Mobile App:** Native iOS/Android

### Extension Points

- **Providers:** Add new LLM providers via `ILLMProvider`
- **Data Sources:** Extend `externalDataSources` schema
- **Events:** Add new event types to `businessEvents`
- **Procedures:** Add new tRPC routers in `server/routers.ts`
- **Components:** Add new pages in `client/src/pages/`

## Roadmap (V1-V11)

See [README.md](./README.md#v1-v11-roadmap) for detailed roadmap.

---

**Last Updated:** August 2026  
**Version:** 1.0.0  
**Status:** Production Ready (Day 1)
