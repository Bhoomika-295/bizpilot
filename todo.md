# BizPilot AI — Day 1 TODO

## Phase 2: Database Schema
- [x] Design comprehensive schema with all core models
- [x] Implement User, Business, BusinessGoal tables
- [x] Implement Customer, Product, Transaction, Expense tables
- [x] Implement BusinessEvent, Recommendation, Strategy, Outcome tables
- [x] Implement ExternalDataSource table with SOURCE, TIMESTAMP, FRESHNESS, RELIABILITY, PROVENANCE fields
- [x] Create and apply all migrations via webdev_execute_sql

## Phase 3: Authentication & Onboarding
- [x] Verify Manus OAuth integration is working
- [x] Build sign-up flow with OAuth redirect
- [x] Build login flow with session persistence
- [x] Build logout functionality
- [x] Create business onboarding form (name, industry, type, country, location, currency, size, employees)
- [x] Implement business goals selection and ranking (multi-select with prioritization)
- [x] Seed demo data for newly onboarded businesses
- [x] Implement protected routes and business data isolation
- [x] Create user profile page

## Phase 4: Core Data Modules
- [x] Build Customers CRUD (list, create, read, update, delete)
- [x] Build Products/Services CRUD
- [x] Build Transactions CRUD
- [x] Build Expenses CRUD
- [x] Create data management pages with tables and forms
- [x] Implement proper validation and error handling
- [x] Add loading and empty states

## Phase 5: CSV Import Pipeline
- [x] Build CSV upload component
- [x] Implement column mapping UI
- [x] Build validation preview with error detection
- [x] Implement import execution with database persistence
- [x] Create import summary report (imported count, skipped rows, warnings)
- [x] Handle edge cases and invalid data gracefully

## Phase 6: Dashboard — Core Structure
- [x] Build main dashboard layout with strong hierarchy
- [x] Implement Business Briefing section (demo labeled)
- [x] Calculate and display health metrics (revenue, expenses, profit, transactions, customers)
- [x] Display business goals section
- [x] Implement data source freshness panel
- [x] Add "DEMO DATA" labels where applicable

## Phase 7: TODAY Concept & Future Signals
- [x] Create TODAY section with clear hierarchy
- [x] Implement empty/demo states for: market changes, competitor moves, opportunities, recommended actions
- [x] Ensure all placeholder content is explicitly labeled
- [x] Design honest messaging for future features

## Phase 8: AI Service Abstraction & Foundation Models
- [x] Create AIService abstraction layer
- [x] Implement ProviderAdapter pattern
- [x] Build safe demo analysis layer (no fake AI responses)
- [x] Create BusinessEvent model and event logging
- [x] Create Recommendation model with full schema
- [x] Create Strategy model with full schema
- [x] Create Outcome model for tracking results
- [x] Implement event stream foundation

## Phase 9: Polish & Testing
- [x] Test sign-up flow end-to-end
- [x] Test login/logout flows
- [x] Test business creation and onboarding
- [x] Test CRUD operations for all data modules
- [x] Test CSV import with various file formats
- [x] Verify data persistence across sessions
- [x] Verify business data isolation (user A cannot see user B's data)
- [x] Test dashboard calculations with real data
- [x] Verify demo data is properly labeled
- [x] Check responsive design on mobile/tablet
- [x] Polish UI and micro-interactions
- [x] Verify all empty/demo states are clearly labeled

## Phase 10: Documentation
- [x] Create README.md with product overview, tech stack, setup instructions
- [x] Create ARCHITECTURE.md with V1-V11 roadmap
- [x] Document database schema and relationships
- [x] Document authentication flow
- [x] Document CSV import process
- [x] List environment variables
- [x] Document current limitations
- [x] Create API documentation for tRPC procedures

## Day 3: Business Health Score
- [x] Inspect and reuse the existing backend health-score service and dashboard integration
- [x] Ensure the score is a real 0–100 calculation from stored revenue, expense, transaction, and customer signals
- [x] Ensure missing or insufficient data returns an honest “Not enough data” state
- [x] Ensure the score explanation is generated from actual score factors
- [x] Ensure the score is labeled “BizPilot Business Health Score” and identifies demo versus real business data
- [x] Verify the score endpoint requires authentication and enforces logged-in business ownership
- [x] Verify the dashboard displays the score without moving the formula into React
- [x] Add or update unit tests for score calculation, data changes, insufficient data, and authorization
- [x] Run type checks, tests, production build, and dashboard visual verification
- [x] Save the Day 3 checkpoint and stop without starting Day 4

### Day 3 Trust Label Follow-up
- [x] Derive demo status from existing seeded demo-source records when a business flag is missing
- [x] Add unit coverage for demo versus real health-score data basis

## Day 4: Data Freshness Indicator
- [x] Inspect and reuse existing transaction, customer, and expense timestamps
- [x] Implement reusable freshness calculation outside React
- [x] Define honest freshness states for up-to-date, needs refresh, and no data
- [x] Protect freshness reads with authentication and business ownership checks
- [x] Add compact Data Status / Last Updated indicator to the existing dashboard
- [x] Verify a new transaction changes the latest timestamp after refresh
- [x] Test no-data and old-data states
- [x] Test tenant isolation and absence of exposed secrets
- [x] Run type checks, unit tests, and production build; document visual verification as environment-limited
- [x] Save the Day 4 checkpoint and stop without starting Day 5

### Day 4 Verification Follow-up
- [x] Add an integration or verified database flow proving a real transaction update changes the persisted freshness timestamp
- [x] Perform and document a Day 4 secret-exposure audit for the freshness feature
- [x] Document authenticated dashboard visual verification as environment-limited; rely on deterministic, persistence, and tenant-authorization tests as the Day 4 evidence
- [x] Document that the preview database has no owned business and that no test data was inserted solely for visual verification
- [x] Show a clear access/error state instead of an indefinite spinner when dashboard data queries are forbidden or fail

### Day 4 Authenticated Verification Follow-up
- [x] Do not authenticate or use browser takeover; the user selected the no-login alternative
- [x] Use deterministic, persistence, and tenant-authorization tests instead of an authenticated dashboard session
- [x] Use the persistence integration test as evidence that an updated business record changes Last updated
- [x] Retain and document no-business and no-data coverage through existing tests and the security audit
- [x] Save the final Day 4 checkpoint and stop

### Day 4 Verification Conclusion
- [x] Use existing deterministic unit tests, real persistence tests, and tenant-authorization test suite as the verification evidence
- [x] Document authenticated visual verification as environment-limited due to required browser sign-in
- [x] Make no further implementation or feature changes
