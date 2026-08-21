# BizPilot Remediation Plan — PostgreSQL Schema/Type Drift

## Objective
Remediate inherited schema, query, and type drift across the BizPilot codebase to achieve a passing test suite and clean TypeScript compilation (`pnpm run check`), without modifying Supabase PostgreSQL production data, schemas, authentication, or completed CSV export features.

## Audit Classification of Failures
1. **Database Column Mismatches (`businesses.userId` vs `user_id` / `owner_id`):**
   - Certain tests and helper functions attempt to insert or query `userId` on the `businesses` table, but the authoritative PostgreSQL schema (`drizzle/schema.postgres.ts`) defines tenant ownership through `userId` or user foreign keys differently or references `businesses` without `userId`.
2. **Missing Columns (`recommendations.payload`):**
   - `recommendations` query helpers in `server/db.ts` select `payload`, but the Supabase database and schema do not include a `payload` column on `recommendations`.
3. **Syntax Error in Situation Trend Filters (`and(..., >=)`):**
   - In `server/services/situationTrendService.ts` or related query builders, date predicates are constructed incorrectly with a missing column reference on one side of `>=` or `<=`, producing `syntax error at or near ">="`.
4. **Missing Helper Functions (`createScenarioAssumption`):**
   - `server/scenarioSimulation.test.ts` or service code calls helper functions that were not exported or implemented in `server/db.ts`.

## Remediation Rules
- **No Database Migrations:** Do not alter Supabase production tables or run Drizzle migrations.
- **Code-Level Adaptations:** Fix Drizzle helper queries, parameter mapping, and missing TypeScript types so they match the actual Supabase database and authoritative schema.
- **Preserve CSV Exports:** Ensure V1, V1.1, and V1.2 features remain completely untouched and fully functional.
