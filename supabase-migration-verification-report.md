# BizPilot — Supabase Migration Phase 1.5 Verification Report

## 1. Actual Current Source Database Engine
- **Engine:** MySQL (specifically MySQL/TiDB accessed via TCP through `drizzle-orm/mysql2`).
- **Evidence:** 
  1. `package.json` includes `"mysql2": "^3.11.3"` and `"drizzle-orm": "^0.38.4"`.
  2. `drizzle.config.ts` explicitly declares `dialect: "mysql"`.
  3. `server/db.ts` initializes Drizzle via `drizzle(mysql.createPool(...))` from `drizzle-orm/mysql2`.
  4. `drizzle/schema.ts` uses `mysqlTable`, `mysqlEnum`, and MySQL-specific Drizzle core imports.

## 2. MySQL / PostgreSQL Compatibility Findings
Transitioning from MySQL to PostgreSQL (Supabase) involves the following dialect and type differences:
- **Table Definition:** `mysqlTable` maps to `pgTable`.
- **Primary Keys:** MySQL auto-increment/serial columns map to PostgreSQL `serial` or `bigserial`.
- **Data Types:** 
  - `varchar` and `text` are fully compatible.
  - `decimal` maps cleanly with precision and scale.
  - `timestamp` maps to PostgreSQL `timestamp` (or `timestamp with time zone`).
  - `json` maps directly to PostgreSQL `json` or `jsonb`.
  - `boolean` maps directly to PostgreSQL `boolean`.
- **Enums:** MySQL `mysqlEnum` maps to PostgreSQL native `pgEnum` or text check constraints.

## 3. Schema Differences
- **Current Schema (`drizzle/schema.ts`):** Built with `drizzle-orm/mysql-core`.
- **Target Schema (`drizzle/schema.postgres.ts`):** Built with `drizzle-orm/pg-core` while preserving exact table names, column names, column types, and tenant ownership fields (`businessId`).

## 4. Required Data Transformations
When migrating data from MySQL to PostgreSQL:
- **Integer/Serial Sequences:** Ensure PostgreSQL sequences (`pg_get_serial_sequence`) are correctly set after inserting rows with explicit IDs to prevent duplicate key errors on subsequent inserts.
- **Timestamps:** Convert MySQL integer epoch timestamps or string timestamps to PostgreSQL native timestamp / bigint format as defined in the schema.
- **JSON Fields:** Ensure JSON payloads serialize/deserialize correctly without escaping mismatches.

## 5. Recommended Supabase Connection Type
- **Migration & Administration:** Use the **Supabase Session Pooler** (port 5432) or direct PostgreSQL connection for running migration scripts and schema deployments, as Drizzle Kit and migration tools require stable connections.
- **Production Application Runtime:** Use the **Supabase Transaction Pooler** (port 6543) if running in a serverless/autoscale environment, or the **Session Pooler** (port 5432) for persistent server instances. BizPilot runs on a persistent backend server, making the **Session Pooler (port 5432)** or direct connection optimal.

## 6. Required Environment Variables
- `DATABASE_URL`: Must be set to the owner's Supabase PostgreSQL connection string (e.g., `postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres?sslmode=require`).
- `JWT_SECRET`: Remains unchanged for session authentication.

## 7. Exact Next Steps for the Owner
1. **Provision Supabase Project:** Create a new PostgreSQL project on Supabase.
2. **Obtain Connection String:** Copy the PostgreSQL connection string (Session pooler URI) from Supabase Dashboard → Settings → Database.
3. **Set Environment Variable:** Inject `DATABASE_URL` via the deployment secret manager or `webdev_request_secrets`.
4. **Execute Migration:** Run Drizzle migration against Supabase PostgreSQL.
5. **Migrate Data:** Execute safe data transfer from MySQL to Supabase PostgreSQL.
6. **Final Cutover:** Verify application health and complete migration.

---
**Verification complete. No code, schema, environment variables, or data were modified.**
