# BizPilot — Supabase PostgreSQL Migration Preparation Guide (Phase 1)

## 1. Supabase Compatibility Findings
- **SQL Dialect Transition:** BizPilot's schema was successfully mapped from MySQL (`mysql-core` in `drizzle/schema.ts`) to PostgreSQL (`pg-core` in `drizzle/schema.postgres.ts`).
- **Data Types:** Serial primary keys, timestamps, decimals, booleans, and JSON/JSONB fields map cleanly between MySQL and PostgreSQL.
- **Tenant Isolation:** Tenant isolation (`businessId`) is strictly preserved across all tables in the PostgreSQL schema.

## 2. Schema Preparation Completed
- Prepared `drizzle/schema.postgres.ts` covering core entities (users, businesses, customers, products, transactions, expenses, business events), strategic intelligence (recommendations, strategies, outcomes, competitors, market signals), advanced decisioning (scenarios, opportunities, action plans), and organizational memory (`businessMemories`, `patternIntelligence`).

## 3. Environment Variable Strategy
- **Production Variable:** `DATABASE_URL` will be updated to point to the owner's Supabase PostgreSQL connection string (Session pooler URI or Transaction pooler URI).
- **Security:** `DATABASE_URL` remains strictly server-side (in `.env` / deployment environment secrets) and is never exposed to the frontend or committed to Git.
- **Separation:** Development, test, and production environments use separate isolated databases.

## 4. Connection Strategy
- **Runtime:** Drizzle ORM configured via `drizzle-orm/postgres-js` or `drizzle-orm/node-postgres` using connection strings.
- **Pooling:** Supabase provides Transaction pooling (port 6543) for serverless/autoscale environments and Session pooling (port 5432) for direct long-lived connections. BizPilot's server uses persistent backend instances compatible with either standard connection or connection pooling.

## 5. Data Migration Strategy
- **Process:** Export source data from MySQL (pg_dump or JSON table export), adapt ID sequences and constraints, and import into Supabase PostgreSQL.
- **Preservation:** All IDs, timestamps, relationships, tenant assignments, and intelligence history are preserved.
- **Safety:** The current Manus-managed MySQL database remains active and untouched until final cutover confirmation by the owner.

## 6. Tenant-Isolation Considerations
- Enforced at both the tRPC router guard (`requireBusinessAccess`) and service query level (`businessId` filters). No schema-level RLS changes are required for migration, preserving the reliable server-side security architecture.

## 7. Exact Steps Remaining Before Final Cutover
1. **Owner Action:** Provision Supabase PostgreSQL project and provide the connection string.
2. **Environment Injection:** Set `DATABASE_URL` via the deployment secret manager (or `webdev_request_secrets`).
3. **Schema Deployment:** Run migration against Supabase PostgreSQL.
4. **Data Transfer:** Execute data migration dump/restore from MySQL to Supabase.
5. **Final Cutover & Verification:** Verify app functionality against Supabase PostgreSQL and retire Manus database.
