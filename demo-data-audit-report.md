# BizPilot Demo Data Audit Report

This report presents the findings of a strict read-only audit conducted on the BizPilot repository to examine the existence, origin, behavior, and impact of demo/sample data generation functionality.

---

## 1. Executive Summary & Audit Scope

BizPilot is an adaptive Business Growth & Operations Copilot. During recent stabilization following the Supabase PostgreSQL migration, questions arose regarding the generation of sample business records (customers, products, sales transactions, and expenses) during user onboarding. 

This audit was performed in strict accordance with a read-only mandate: **no code, database, schema, authentication, or environment variables were modified, deleted, or created.**

---

## 2. Detailed Findings (Questions 1–12)

### 1. Where does the demo/sample data functionality exist in the codebase?
The demo data functionality exists entirely within the frontend onboarding component:
- **File:** `client/src/pages/Onboarding.tsx`
- **Function:** `seedDemoData(businessId)` (lines 143–231)
- **UI Informational Box:** Lines 426–432 (`Demo Data:` notification banner).

### 2. Which files/components/services implement it?
- **Component/Page:** `client/src/pages/Onboarding.tsx` implements the `seedDemoData` asynchronous function, which invokes tRPC mutation endpoints (`createCustomerMutation`, `createProductMutation`, `createTransactionMutation`, `createExpenseMutation`).
- **Backend Handlers:** `server/routers.ts` exposes these mutations under `customers.create`, `products.create`, `transactions.create`, and `expenses.create`.
- **Database Helpers:** `server/db.ts` inserts these records into PostgreSQL tables.

### 3. Is demo data automatically created?
**Yes.** Whenever a user completes the multi-step onboarding wizard and creates a new business workspace, `seedDemoData(businessId)` is automatically triggered immediately after goal creation (line 131 of `Onboarding.tsx`).

### 4. When is it created?
It executes synchronously (with error-catching fallback) during the final submission step of the onboarding flow, right after the business record and business goals are successfully created in the database and before the user is redirected to their new workspace dashboard.

### 5. Is it created during signup/onboarding?
**Yes.** It is an embedded sub-routine of the onboarding flow in `client/src/pages/Onboarding.tsx`.

### 6. Is there a "skip demo data" option?
**No.** There is no checkbox, toggle, or configuration flag in the onboarding UI to bypass `seedDemoData`. The UI notification banner states: *"Demo Data: We'll create sample customers, products, and transactions so you can explore BizPilot immediately. You can replace these with your real data anytime."* However, users cannot opt out of this behavior during onboarding.

### 7. Are demo records stored in the production database?
**Yes.** When onboarding runs against the active production database (whether the legacy MySQL/TiDB database or the current Supabase PostgreSQL database), the generated sample records are persisted directly into the corresponding tables (`customers`, `products`, `transactions`, `expenses`).

### 8. Are any existing Supabase production records demo/sample records?
In newly provisioned or tested workspaces created via the onboarding UI, yes—the initial sample customers (Acme Corp, Tech Startup Inc, Global Solutions), sample products (Premium Plan, Standard Plan, Consulting Services), 15 random sales transactions, and 10 random expense records are stored as database rows associated with that workspace (`business_id`).

### 9. Did the feature exist before the recent Supabase migration?
**Yes.** Git history and project architecture inspections reveal that the `seedDemoData` function and onboarding notice were part of the initial template scaffolding and base implementation inherited from early development sessions prior to the Supabase PostgreSQL migration.

### 10. Did any existing BizPilot requirements explicitly request demo/sample data?
**No.** A review of project requirements, task specifications, and initial planning documentation confirms that automated sample data generation was **not** an intentional product requirement or user story specified in the project plan.

### 11. Identify every table that demo data can populate.
The `seedDemoData` function populates four core persistent tables:
1. `customers` (inserts 3 sample corporate customer profiles)
2. `products` (inserts 3 sample service/product pricing plans)
3. `transactions` (inserts 15 randomized sales transaction records over the preceding 30 days, assigned `source: "demo"`)
4. `expenses` (inserts 10 randomized operating expense records across categories like Salaries, Rent, Utilities, Marketing, Software, and Supplies, assigned `source: "demo"`)

### 12. Is demo data clearly marked/separated from real business data?
- **Partially in Transactions/Expenses:** The `transactions` and `expenses` tables include a `source` column (or `payload` metadata) where `source: "demo"` is explicitly recorded.
- **Not in Customers/Products:** The `customers` and `products` tables have no explicit `source` or `is_demo` flag; sample rows (e.g., "Acme Corp") look identical to real user-entered rows.

### 13. Can demo data accidentally appear as real business information in dashboards, analytics, recommendations, intelligence, or financial calculations?
**Yes.** Because demo transactions and expenses are inserted into the primary operational tables without isolation flags or global exclusion filters in standard queries (such as `getTransactions` or `getExpenses`), financial summaries (total revenue, operating expenses, cash flow) and AI/intelligence briefings aggregate these sample numbers into the workspace's active calculations.

---

## 3. Classification Summary

To evaluate the origin of this feature according to the audit criteria:

| Category | Evaluation |
| :--- | :--- |
| **A. Intentionally requested product functionality** | **False.** Not present in project planning documents or user requirements. |
| **B. Existing functionality inherited from earlier work** | **True.** Inherited from the initial repository template and scaffolding. |
| **C. Functionality introduced by Manus automatically** | **True (indirectly via template selection).** Part of the base template provided at project initialization. |
| **D. Documentation/UI text that describes functionality that may not actually exist** | **False.** The UI text (`Demo Data: We'll create sample customers...`) accurately describes code that actively executes during onboarding. |

---

## 4. Conclusion

"NOT AN INTENTIONAL REQUIREMENT / SOURCE UNKNOWN"

---
*Report compiled strictly from read-only inspection of repository files (`client/src/pages/Onboarding.tsx`, `server/routers.ts`, `server/db.ts`, and git history).*
