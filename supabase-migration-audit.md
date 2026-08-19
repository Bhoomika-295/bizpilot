# BizPilot — Database Ownership Migration Audit (Phase 0)

## 1. Current Database
- **Provider/Type:** MySQL / TiDB accessed via TCP connection string (`DATABASE_URL`).
- **Connection Mechanism:** Drizzle ORM configured with `drizzle-orm/mysql2` driver (`server/db.ts`).
- **Environment Variables:** `DATABASE_URL` specifies the connection string. Other app env vars include `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, and `BUILT_IN_FORGE_API_KEY`.
- **ORM / Query Layer:** Drizzle ORM (`drizzle-orm`) using query builder patterns (`select`, `insert`, `update`, `delete`, `eq`, `and`, `or`, `inArray`, `desc`).

## 2. Database Schema
- **Schema Location:** `drizzle/schema.ts` (MySQL syntax using `mysqlTable`, `mysqlEnum`, `int`, `varchar`, `text`, `timestamp`, `decimal`, `boolean`, `json`, `serial`).
- **Dialect:** MySQL (`drizzle.config.ts` specifies `dialect: "mysql"`).
- **Relationships:** Foreign keys and relationships are enforced at the application/service level (`businessId` tenant isolation in queries) rather than declared foreign key constraints in Drizzle schema definitions.

## 3. All Database Tables
BizPilot persists data across over 40 tables spanning core business entities, operational records, and multi-layered intelligence engines:

| Table Name | Purpose | Primary Key | Tenant ID (`businessId`) | Sensitive / User Data | Historical Intelligence |
|---|---|---|---|---|---|
| `users` | User mirror synced from Manus OAuth | `id` (serial/int) | N/A (`openId`) | Yes (email, name) | No |
| `businesses` | Tenant workspaces | `id` | `id` (Workspace PK) | Yes | No |
| `businessGoals` | User-selected business goals | `id` | Yes | No | Yes (Strategy) |
| `customers` | Customer directory & status | `id` | Yes | Yes (email, phone) | Yes |
| `products` | Products and service catalog | `id` | Yes | No | Yes |
| `transactions` | Sales / revenue transactions | `id` | Yes | Yes (financial) | Yes (Metrics/Drivers) |
| `expenses` | Operating expenses & costs | `id` | Yes | Yes (financial) | Yes (Metrics/Cash Pressure) |
| `businessEvents` | General business timeline events | `id` | Yes | No | Yes |
| `recommendations` | AI/system recommendations | `id` | Yes | No | Yes |
| `strategies` | Business strategies & alignment | `id` | Yes | No | Yes |
| `outcomes` | Strategy and decision outcomes | `id` | Yes | No | Yes (Learning loop) |
| `externalDataSources` | External data connectors | `id` | Yes | No | No |
| `csvImports` | CSV import history | `id` | Yes | No | No |
| `competitors` | Competitor profiles | `id` | Yes | No | Yes (Market Watch) |
| `marketSignals` | Market intelligence signals | `id` | Yes | No | Yes |
| `strategyStates`, `strategyEvents`, `strategyVersions` | Strategy adaptation history | `id` | Yes | No | Yes (Strategy v2) |
| `scenarios`, `scenarioComparisons`, `scenarioHistory`, `scenarioAssumptions`, `scenarioReviews` | What-if scenarios & simulations | `id` | Yes | No | Yes (Simulation v2) |
| `opportunities` | Opportunity pipeline & actionability | `id` | Yes | No | Yes (Opportunity v2) |
| `competitorActivities` | Tracked competitor moves | `id` | Yes | No | Yes |
| `decisionCandidates`, `decisionEvents` | Decision intelligence options & votes | `id` | Yes | No | Yes (Decision v2) |
| `monitoringEvents`, `monitoringPreferences`, `monitoringEventHistory` | Continuous early-warning monitor | `id` | Yes | No | Yes (Monitoring v1) |
| `signalRelationships`, `signalClusters`, `signalRelationshipHistory` | Business relationship graph | `id` | Yes | No | Yes (Relationship v1) |
| `businessTrajectories`, `trajectoryForecastSnapshots`, `trajectoryLearningSignals`, `trajectoryHistory` | Trajectory & forecasting | `id` | Yes | No | Yes |
| `strategyHealthSnapshots` | Strategy health tracking | `id` | Yes | No | Yes |
| `externalEvents`, `externalEventReviews`, `externalRadarSnapshots` | External radar signals | `id` | Yes | No | Yes |
| `attentionItems`, `attentionReviewLogs` | Executive attention items | `id` | Yes | No | Yes (Executive Briefs) |
| `foresightSignals`, `foresightWatchlist` | Strategic foresight & emerging signals | `id` | Yes | No | Yes (Foresight v2) |
| `businessMemories`, `patternIntelligence` | Organizational memory & recurring patterns | `id` | Yes | No | Yes (Memory v2) |
| `dailyBriefs` | Morning business view briefings | `id` | Yes | No | Yes |
| `actionPlans`, `actionPlanEvents` | Action execution tracking | `id` | Yes | No | Yes (Execution v2) |
| `futureOutlooks`, `business_readiness_assessments` | Future outlook & readiness dimensions | `id` | Yes | No | Yes (Readiness v2) |
| `rootCauseInvestigations` | Root-cause analysis & contributor trees | `id` | Yes | No | Yes (Diagnostics v1) |
| `businessRelationships` | Non-causal business graph links | `id` | Yes | No | Yes |

## 4. Database Access Map
- **Connection Factory:** `server/db.ts` exposes `getDb()`, initializing Drizzle lazily on first query.
- **Repositories & Query Helpers:** All CRUD operations are centralized in TypeScript helper functions within `server/db.ts` and dedicated services (`server/services/businessDataService.ts`, `businessMetricEngine.ts`, `commandCenterService.ts`, etc.).
- **Routers:** tRPC routers (`server/routers.ts` and feature routers) invoke database helpers via protected procedures.
- **Raw SQL:** None; all queries are executed via Drizzle ORM query builders.

## 5. Tenant Isolation Audit
- **Enforcement Level:** Tenant isolation is enforced at both the router level and service level.
- **Router Guard:** Every protected business-scoped procedure calls `requireBusinessAccess(userId, businessId)` (defined in `server/routers.ts` and `server/services/businessDataService.ts`), which queries the `businesses` table verifying that `id = businessId` and `userId = userId`.
- **Query Level:** All business-scoped table queries explicitly filter by `eq(table.businessId, businessId)`.
- **Cross-Tenant Risk:** Low, provided that `verifyBusinessOwnership` is invoked before any business-scoped query. No database-level Row Level Security (RLS) policies currently exist in MySQL; security is maintained at the application/tRPC procedure layer.

## 6. Authentication Dependencies
- **Authentication Source:** Manus OAuth (`/api/oauth/callback`) paired with local session cookies (`JWT_SECRET`) and user mirroring in the local `users` table (`server/_core/sdk.ts`).
- **Database Coupling:** The `users` table stores user profiles and `openId` mappings.
- **Supabase Migration Plan for Auth:** Authentication **does not** need to be tied to the database migration. The existing Manus OAuth session mechanism (`JWT_SECRET` cookie / bearer auth) can remain fully operational independently of where persistent business data is stored. Alternatively, authentication can remain app-managed while database tables reside in Supabase PostgreSQL.

## 7. Manus-Specific Dependencies
- **Core Application Logic:** Completely independent of Manus infrastructure, written in standard TypeScript/Node.js/React.
- **Storage:** File storage relies on Manus Forge S3 helpers (`server/storage.ts`).
- **Database:** Currently tied to a managed MySQL instance via `DATABASE_URL`.
- **Auth:** Relies on Manus OAuth portal (`OAUTH_SERVER_URL`, `VITE_APP_ID`).

## 8. Data Migration Requirements
- **Format:** Export current MySQL tables as SQL insert statements or JSON records.
- **Mapping & Dialect Conversion:** MySQL Drizzle schema needs to be converted to PostgreSQL Drizzle schema (`drizzle-orm/postgres-js` or `drizzle-orm/node-postgres`).
- **Types & Enums:** MySQL enums (`mysqlEnum`) map to PostgreSQL enums (`pgEnum`) or text constraints. MySQL timestamps and auto-increment (`serial`) map to PostgreSQL `serial` / `bigserial` and `timestamp with time zone`.

## 9. Supabase Compatibility
- **ORM Compatibility:** Drizzle ORM supports PostgreSQL natively via `drizzle-orm/postgres-js` or `drizzle-orm/node-postgres`, making Supabase PostgreSQL an excellent fit.
- **Schema Portability:** Table definitions in `drizzle/schema.ts` can be migrated from `mysql-core` to `pg-core` with straightforward type equivalents (`serial`, `varchar`, `text`, `timestamp`, `decimal`, `boolean`, `json`).

## 10. Risks
1. **Dialect Differences:** Transitioning from MySQL syntax/types to PostgreSQL requires updating schema definitions (`drizzle/schema.ts`) and the database connection driver (`server/db.ts`).
2. **Migration Scripting:** Ensuring all 40+ tables and historical intelligence records transfer without data loss or ID sequence misalignment.
3. **Environment Cutover:** Ensuring Supabase connection pooling and credentials (`DATABASE_URL` pointing to Supabase Postgres pooler) are correctly injected.

## 11. Exact Files That Would Need Changes (For Future Migration)
1. `drizzle.config.ts` (update dialect to `postgresql`)
2. `drizzle/schema.ts` (migrate from `mysql-core` to `pg-core`)
3. `server/db.ts` (switch import from `drizzle-orm/mysql2` to PostgreSQL driver)
4. `package.json` (replace `mysql2` dependency with `postgres` or `pg`)

## 12. Proposed Migration Plan
1. **Phase 1 (Preparation):** Provision Supabase PostgreSQL project and verify connection string.
2. **Phase 2 (Schema Porting):** Create a PostgreSQL-compatible schema branch updating `drizzle/schema.ts` and `drizzle.config.ts`.
3. **Phase 3 (Driver Switch):** Update `server/db.ts` and dependencies (`package.json`) to use PostgreSQL driver.
4. **Phase 4 (Data Migration):** Export existing business and intelligence data from MySQL and import into Supabase PostgreSQL.
5. **Phase 5 (Verification):** Run test suite (`pnpm test`), TypeScript check (`tsc --noEmit`), and production build (`pnpm build`) against Supabase PostgreSQL.

---
**Audit complete. No implementation or database changes were made.**
