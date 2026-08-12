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

## Day 5: Business Change Detection
- [x] Inspect and reuse existing metric, freshness, dashboard, and authorization services
- [x] Implement one reusable internal change-detection calculation outside React
- [x] Compare current period with previous comparable period using existing business metrics
- [x] Use an easy-to-change meaningful-change threshold and avoid hardcoded statements
- [x] Add compact What Changed section to the existing dashboard
- [x] Label the section as Internal Business Signal and distinguish it from external market signals
- [x] Handle insufficient historical data and no-significant-change states honestly
- [x] Verify a stored transaction update changes the detected internal signal through a persistence-backed protected getChanges integration test
- [x] Test metric alignment, no-change behavior, insufficient data, and tenant authorization
- [x] Run type checks, full tests, production build, and document visual verification as environment-limited
- [x] Save the Day 5 checkpoint and stop without starting Day 6

### Day 5 Verification Follow-up
- [x] Document that an owned-dashboard screenshot with persisted business data is environment-limited because the current preview route has no owned business data

### Day 5 Verification Follow-up
- [x] Document that What Changed could not be captured on an owned dashboard because the current preview route has no owned business data; authenticated visual state remains environment-limited
- [x] Add an integration or endpoint-level test proving persisted transaction changes alter the protected getChanges output
- [x] Obtain explicit approval to treat Day 5 owned-dashboard visual verification as environment-limited if no owned preview business is available

## Day 6: Signal Priority
- [x] Inspect existing change detection, What Changed UI, tests, and authorization
- [x] Add transparent service-layer priority calculation with configurable thresholds
- [x] Assign LOW, MEDIUM, or HIGH from observed change magnitude only
- [x] Handle missing and insufficient data safely without fake priority
- [x] Display Signal Priority subtly in the existing What Changed section
- [x] Preserve internal-signal wording and avoid AI or prediction claims
- [x] Verify tenant authorization remains enforced
- [x] Add focused threshold, insufficient-data, persistence, and authorization tests
- [x] Run type checks, full tests, production build, and visual verification
- [x] Save the Day 6 checkpoint and stop without starting Day 7

## Day 7: Intelligent Business Briefing
- [x] Inspect existing metrics, changes, signal priority, and dashboard architecture
- [x] Implement reusable deterministic briefing service (`generateBusinessIntelligenceBriefing`)
- [x] Add protected tRPC endpoint `businessMetrics.getBriefing` with strict tenant authorization
- [x] Integrate "Business Intelligence Briefing" card into DashboardV2 with prioritized signals, explanations, evidence, and suggested next steps
- [x] Ensure factually grounded phrasing without AI or prediction claims
- [x] Add deterministic unit tests for briefing generation and priority ordering
- [x] Pass full test suite (29 tests passed), TypeScript checks, and production build
- [x] Document authenticated visual verification as environment-limited (no owned preview business data)
- [x] Save Day 7 checkpoint and stop without starting Day 8

## Day 8: Competitor Watchlist & Market Intelligence Foundation
- [x] Inspect existing schema, database helpers, routing, navigation, and dashboard patterns
- [x] Add tenant-scoped competitor table in Drizzle schema and execute migration SQL
- [x] Add backend CRUD query helpers in `server/db.ts`
- [x] Expose protected `competitors` tRPC router procedures with strict tenant authorization checks
- [x] Build `CompetitorsPage.tsx` with directory list, summary metrics, profile detail view, strategic notes, and add/edit modals
- [x] Add Competitors navigation item to `DashboardLayout.tsx` and register route in `App.tsx`
- [x] Extend tenant authorization tests in `server/tenant.authorization.test.ts` for competitor routes
- [x] Pass full test suite (30 tests passed), TypeScript checks, and production build
- [x] Document authenticated visual verification as environment-limited (no owned preview business data)
- [x] Save Day 8 checkpoint and stop without starting Day 9

## Day 9: Real-Time Market Signals v1
- [x] Inspect current competitor, dashboard, database, and integration architecture
- [x] Create `marketSignals` table in Drizzle schema and execute migration SQL
- [x] Implement server-side GDELT API adapter (`server/services/marketSignalService.ts`) with timeout, content-type checks, deduplication, and safe fallback
- [x] Add protected `getMarketSignals` and `refreshMarketSignals` tRPC procedures with tenant authorization
- [x] Integrate "Market Signals & Industry Watch" card into DashboardV2 with real-time badges, source links, published timestamps, and explicit Refresh action
- [x] Add deterministic unit and integration tests for GDELT normalization and resilience (`server/marketSignal.test.ts`)
- [x] Pass full test suite (32 tests passed), TypeScript checks, and production build
- [x] Document authenticated visual verification as environment-limited (no owned preview business data)
- [x] Save Day 9 checkpoint and stop without starting Day 10

## Day 10: Market Signal Relevance & Business Impact
- [x] Inspect existing market signal, competitor, and briefing architecture
- [x] Add deterministic relevance engine (`classifyRelevance`: HIGH for exact competitor match, MEDIUM for industry keyword match, LOW for general)
- [x] Add impact area classifier (`classifyImpactArea`: Revenue, Customers, Expenses, Competition, Operations, Product/Service, General Market)
- [x] Add importance scorer (`calculateImportanceAndExplanation`: 1-5 score with transparent rule-based explanation)
- [x] Extend Drizzle schema with `relevanceLevel`, `impactArea`, `importanceScore`, and `explanation` columns and run migration SQL
- [x] Integrate enrichment into `refreshMarketSignalsForBusiness` ingestion pipeline
- [x] Enhance DashboardV2 Market Intelligence card with relevance badges, impact areas, transparent explanations, and simple category filters (All, High relevance, Competitors, Industry, Recent)
- [x] Add Market Watch summary header (total signals, high relevance count, competitors mentioned)
- [x] Add External Signals section to existing Business Intelligence Briefing
- [x] Extend unit tests for relevance, impact classification, and importance scoring (`server/marketSignal.test.ts`)
- [x] Extend tenant authorization tests (`server/tenant.authorization.test.ts`)
- [x] Pass full test suite (37 tests passed), TypeScript checks, and production build
- [x] Document authenticated visual verification as environment-limited (no owned preview business data)
- [x] Save Day 10 checkpoint and stop without starting Day 11

## Day 11: AI Strategy Copilot v1
- [x] Inspect existing recommendation models, metrics engine, market signals, and dashboard layout
- [x] Build Strategy Copilot service (`server/services/strategyCopilotService.ts`) with deterministic rule engine (expense growth, revenue/transaction decline, customer attrition, high-relevance market signals)
- [x] Implement evidence tracing (metrics, health score, signal metadata) and confidence ratings
- [x] Implement database recommendation persistence and status management (`OPEN`, `COMPLETED`, `DISMISSED`)
- [x] Expose protected tRPC procedures (`getStrategyBriefing`, `updateStrategyStatus`) with strict tenant authorization checks
- [x] Integrate Strategy Copilot card into `DashboardV2.tsx` with priority badges, evidence expanders, and interactive action buttons (Mark Completed, Dismiss, Reopen)
- [x] Add deterministic unit tests (`server/strategyCopilot.test.ts`) and extend tenant authorization test suite (`server/tenant.authorization.test.ts`)
- [x] Pass full test suite (40 tests passed), TypeScript checks, and production build
- [x] Document authenticated visual verification as environment-limited (no owned preview business data)
- [x] Save Day 11 checkpoint and stop without starting Day 12

## Day 12: Strategy Outcomes & Learning Loop v1
- [x] Inspect recommendation schema, recommendation service, and dashboard structure
- [x] Extend recommendations table schema in `drizzle/schema.ts` with outcome status (`Positive`, `Neutral`, `Negative`, `Unknown`), outcome notes, metric before/after, and observed change fields
- [x] Generate Drizzle migration and apply via `webdev_execute_sql`
- [x] Build Strategy Outcomes & Learning service (`server/services/strategyCopilotService.ts`) with effectiveness summary calculations, category breakdown, and historical insights
- [x] Expose protected tRPC procedures (`recordOutcome`, `getPerformanceAnalytics`) with strict tenant authorization checks
- [x] Integrate Strategy Performance Analytics card and Outcome & Learning modal into `DashboardV2.tsx`
- [x] Add deterministic unit tests (`server/strategyOutcomes.test.ts`) and extend tenant authorization test suite (`server/tenant.authorization.test.ts`)
- [x] Pass full test suite (44 tests passed), TypeScript checks, and production build
- [x] Document authenticated visual verification as environment-limited (no owned preview business data)
- [x] Save Day 12 checkpoint and stop without starting Day 13

## Day 14: Situation Timeline & Trend Intelligence v1
- [x] Inspect existing BusinessSituation system, Strategy Copilot context, and dashboard layout
- [x] Create `situationSnapshots` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for situation snapshots in `server/db.ts`
- [x] Implement deterministic Trend Intelligence Engine (`server/services/situationTrendService.ts`) with historical change analysis (IMPROVING, WORSENING, STABLE, NEW, RESOLVED, RECURRING) and duplicate snapshot prevention
- [x] Extend Strategy Copilot context and rules to factor in situation trend direction (e.g. WORSENING vs IMPROVING cost pressure)
- [x] Expose protected tRPC router procedures for getting situation timeline, trend summary, business trends overview, and historical window (7/30/90 days)
- [x] Integrate Business Trends overview card, situation timeline detail modal, and What Changed since last review into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for trend classification, recurring situation detection, snapshot deduplication, and tenant authorization (`server/situationTrend.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 14 checkpoint and stop

## Day 15: Decision Priority & Strategic Focus Engine v1
- [x] Inspect existing business situations, trends, signals, Strategy Copilot, and dashboard layout
- [x] Create `decisionPriorities` table in Drizzle schema and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for decision priorities in `server/db.ts`
- [x] Implement deterministic Decision Priority Engine (`server/services/decisionPriorityEngine.ts`) multi-signal scoring, trend amplification, health interaction, fresh data penalties, and "Why now?" explanation generator
- [x] Extend Strategy Copilot service (`server/services/strategyCopilotService.ts`) to consume decision priorities and avoid recommendation fatigue
- [x] Expose protected tRPC router procedures (`getDecisionPriorities`, `getDecisionPriorityDetail`) in `server/routers/businessMetrics.ts`
- [x] Integrate "Today's Strategic Focus" (Top 3 Focus Areas) card and Evidence Drill-Down modal into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for priority scoring, fatigue prevention, and tenant authorization (`server/decisionPriority.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 15 checkpoint and stop

## Day 15: Decision Priority & Strategic Focus Engine v1
- [x] Inspect existing Strategy Copilot, Business Situations, and Dashboard V2 layout
- [x] Create `decisionPriorities` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for decision priorities in `server/db.ts`
- [x] Implement deterministic Decision Priority Engine (`server/services/decisionPriorityEngine.ts`) with multi-signal synthesis, impact/urgency scoring, and fatigue prevention
- [x] Expose protected tRPC router procedures for `getDecisionPriorities` and `getDecisionPriorityDetail`
- [x] Integrate "Today's Strategic Focus" top priority card and evidence drill-down modal into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for priority ranking, freshness awareness, and tenant authorization (`server/decisionPriority.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 15 checkpoint and stop

## Day 16: Adaptive Strategy Engine v1
- [x] Inspect existing Strategy Copilot, Strategy Recommendations, Decision Priorities, and Dashboard V2 layout
- [x] Create `strategyStates` and `strategyEvents` tables in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for strategy states and events in `server/db.ts`
- [x] Implement deterministic Adaptive Strategy Engine (`server/services/adaptiveStrategyService.ts`) with context comparison, staleness detection, re-evaluation outcomes (KEEP, UPDATE, DEPRIORITIZE, REPLACE, EXPIRED), and change explanation generation
- [x] Expose protected tRPC router procedures for `getAdaptiveStrategyState`, `reevaluateStrategy`, and `getStrategyTimeline`
- [x] Integrate Adaptive Strategy Evolution card, re-evaluation history, and status management into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for strategy re-evaluation, stability preservation when nothing changes, evidence change replacement, and tenant authorization (`server/adaptiveStrategy.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 16 checkpoint and stop

## Day 16: Adaptive Strategy & Re-evaluation Engine v1
- [x] Inspect existing Strategy Copilot, Business Situations, and Dashboard V2 layout
- [x] Create `strategyStates` and `strategyEvents` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for strategy states and events in `server/db.ts`
- [x] Implement deterministic Adaptive Strategy Engine (`server/services/adaptiveStrategyService.ts`) with strategy state tracking, staleness detection, and context comparison (`KEEP`, `UPDATE`, `REPLACE`, `DEPRIORITIZE`)
- [x] Expose protected tRPC router procedures for `getAdaptiveStrategyTimeline` and `reevaluateStrategies`
- [x] Integrate "Adaptive Strategy & Evolution Timeline" card and interactive re-evaluation trigger into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for strategy re-evaluation and tenant authorization (`server/adaptiveStrategy.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 16 checkpoint and stop

## Day 17: Scenario & What-If Intelligence v1
- [x] Inspect existing project state, database schema, and Dashboard V2 layout
- [x] Create `scenarios` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for scenarios in `server/db.ts`
- [x] Implement deterministic Scenario Intelligence Engine (`server/services/scenarioService.ts`) with baseline comparison, impact mapping, range-based estimation, and strategic impact analysis
- [x] Expose protected tRPC router procedures for `getScenarios`, `createScenario`, `getScenarioById`, and `deleteScenario`
- [x] Integrate Scenario Intelligence card, Scenario Builder modal, and Baseline vs Scenario comparison modal into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for scenario calculation, baseline isolation, and tenant authorization (`server/scenario.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 17 checkpoint and stop

## Day 17: Scenario & What-If Intelligence v1
- [x] Inspect existing Strategy Copilot, Business Situations, and Dashboard V2 layout
- [x] Create `scenarios` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for scenarios in `server/db.ts`
- [x] Implement deterministic Scenario Intelligence Engine (`server/services/scenarioService.ts`) supporting price changes, marketing adjustments, cost shifts, demand variations, and competitor responses
- [x] Expose protected tRPC router procedures for `getScenarios`, `getScenarioById`, `createScenario`, and `deleteScenario`
- [x] Integrate "Scenario Intelligence & What-If Simulations" card, simulation builder modal, and baseline-vs-scenario comparison modal into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for scenario estimation and tenant authorization (`server/scenario.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 17 checkpoint and stop

## Day 18: Opportunity Intelligence Engine v1
- [x] Inspect existing Strategy Copilot, Business Situations, Scenario Engine, and Dashboard V2 layout
- [x] Create `opportunities` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for opportunities in `server/db.ts`
- [x] Implement deterministic Opportunity Detection Service (`server/services/opportunityService.ts`) identifying growth, market, customer, competitive, and operational opportunities from verified intelligence
- [x] Expose protected tRPC router procedures for `getOpportunities`, `getOpportunityById`, `updateOpportunityStatus`, and scenario exploration linkage
- [x] Integrate "Opportunity Intelligence" card, opportunity detail modal, and scenario exploration button into `DashboardV2.tsx`
- [x] Extend Strategy Copilot context and rules to factor in top opportunities alongside risks and situations
- [x] Add deterministic unit and integration tests for opportunity detection and tenant authorization (`server/opportunity.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 18 checkpoint and stop

## Day 19: Competitive Strategy Intelligence v2
- [x] Inspect existing competitor watchlist, market signals, adaptive strategy engine, and Dashboard V2 layout
- [x] Create `competitorActivities` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for competitor activities in `server/db.ts`
- [x] Implement deterministic Competitive Strategy Intelligence v2 Engine (`server/services/competitiveIntelligenceService.ts`) with activity categorization (PRICING, PRODUCT, MARKETING, EXPANSION, HIRING, PARTNERSHIP, POSITIONING, CUSTOMER, OPERATIONS, OTHER), activity trend analysis (INCREASING, DECREASING, STABLE, NEW, UNKNOWN), internal signal correlation, impact areas, and strategic relevance scoring
- [x] Expose protected tRPC router procedures for `getCompetitorIntelligence`, `getCompetitorActivityTimeline`, and `getCompetitorDetail`
- [x] Integrate "Competitive Strategy Intelligence" card, competitor timeline modal, and detail view into `DashboardV2.tsx`
- [x] Extend Strategy Copilot and Adaptive Strategy engines to factor in competitor activity trends and trigger strategy review alerts when competitor behavior shifts meaningfully
- [x] Add deterministic unit and integration tests for competitor activity trend calculation, correlation, and tenant authorization (`server/competitiveIntelligence.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 19 checkpoint and stop

## Day 19: Competitive Strategy Intelligence Engine v2
- [x] Inspect existing Competitor Watchlist, Market Signals, and Dashboard V2 layout
- [x] Create `competitorActivities` table schema in Drizzle and execute migration SQL via `webdev_execute_sql`
- [x] Add Drizzle CRUD helpers for competitor activities in `server/db.ts`
- [x] Implement deterministic Competitive Intelligence Service (`server/services/competitiveIntelligenceService.ts`) with competitor activity tracking, trend analysis, relevance classification, and internal impact correlation
- [x] Expose protected tRPC router procedures for `getCompetitorIntelligence` and `getCompetitorTimeline`
- [x] Integrate "Competitive Strategy Intelligence" card and competitor timeline detail modal into `DashboardV2.tsx`
- [x] Add deterministic unit and integration tests for competitor intelligence and tenant authorization (`server/competitiveIntelligence.test.ts`)
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 19 checkpoint and stop

## Day 20: Decision Intelligence Engine v1
- [x] Add tenant-isolated decision candidate and decision event schema with lifecycle status, evidence references, uncertainty, reversibility, action options, strategy alignment, dependencies, conflicts, and optional outcome linkage
- [x] Generate and apply the Day 20 database migration safely
- [x] Implement reusable Decision Intelligence Service using existing situations, opportunities, competitor intelligence, market signals, scenarios, strategy state, outcomes, and priority context without duplicating upstream engines
- [x] Add deterministic decision taxonomy, ranking, urgency, evidence strength, strategic alignment, conflict, dependency, cost-of-inaction, uncertainty, and explainability logic
- [x] Add protected tRPC procedures for decision queue, detail/evidence chain, refresh, lifecycle transitions, history, and optional outcome linking with strict businessId authorization
- [x] Add Decision Intelligence dashboard queue showing the top 3–7 decisions needing attention
- [x] Add decision detail view with why this matters, evidence chain, known/unknown facts, potential consequences, reversibility, strategic relationship, action options, recommended next step, and scenario exploration entry point
- [x] Add deterministic unit, persistence, lifecycle, and tenant-isolation tests for Day 20
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 20 checkpoint

## Day 22: Continuous Business Monitoring & Intelligence Alerts v1
- [ ] Create tenant-isolated `monitoringEvents` table schema in Drizzle and generate migration SQL
- [ ] Apply Day 22 migration via `webdev_execute_sql` and add Drizzle CRUD helpers in `server/db.ts`
- [ ] Implement deterministic Continuous Monitoring Service (`server/services/continuousMonitoringService.ts`) consuming situations, opportunities, competitor intelligence, market signals, decision priorities, health score, freshness, and strategy state with deterministic fingerprinting and lifecycle states (`NEW`, `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`)
- [ ] Expose protected tRPC router procedures (`getMonitoringAlerts`, `refreshMonitoringAlerts`, `updateMonitoringAlertStatus`) in `server/routers/businessMetrics.ts`
- [ ] Integrate "Continuous Intelligence Alerts & Monitoring" card and alert detail modal into `DashboardV2.tsx`
- [ ] Add deterministic unit and tenant authorization tests (`server/continuousMonitoring.test.ts`)
- [ ] Run full test suite, TypeScript checks, and production build verification
- [ ] Save Day 22 checkpoint

## Day 22: Continuous Business Monitoring & Intelligence Alerts v1
- [x] Add tenant-isolated monitoring events, preferences, and history schema
- [x] Implement continuous monitoring service with meaningful-change detection across situations, opportunities, competitors, strategy conflicts, outcomes, health scores, and data freshness
- [x] Add fingerprint-based deduplication, lifecycle reconciliation (NEW, ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED), and priority/severity threshold filtering
- [x] Expose protected tRPC procedures for monitoring alerts, detail inspection, manual refresh, lifecycle transitions, history audit logs, and alert preferences
- [x] Integrate "What Changed Since Last Review" monitoring alert queue card and detail modal into DashboardV2
- [x] Add deterministic unit tests, tenant isolation tests, and run test suite and production build verification
- [x] Save Day 22 checkpoint

## Day 23: Cross-Signal Intelligence & Relationship Analysis v1
- [x] Add tenant-isolated signalRelationships and signalClusters schema tables
- [x] Implement cross-signal intelligence service with non-causal relationship analysis (TEMPORAL, CORRELATED, CONVERGING, CONTRADICTING, SEQUENTIAL, UNKNOWN) across metrics, signals, competitors, situations, opportunities, and outcomes
- [x] Add evidence strength, stability, theme grouping, and cluster synthesis without hardcoding or fake causality claims
- [x] Expose protected tRPC procedures (`getCrossSignalIntelligence`, `refreshCrossSignalIntelligence`, `getSignalRelationshipDetail`) with strict tenant authorization
- [x] Integrate "What Changed Together" cross-signal intelligence card and detail modal into DashboardV2
- [x] Add deterministic unit tests, tenant isolation tests, and run test suite and production build verification
- [x] Save Day 23 checkpoint

## Day 24: Business Trajectory & Early-Warning Forecasting v1
- [x] Add tenant-isolated trajectory and forecast snapshot schema with observed/projected separation, freshness, confidence, and forecast-vs-actual foundation
- [x] Implement deterministic business trajectory service using existing historical metric observations, direction, momentum, volatility, data sufficiency, confidence, forecast windows, and controlled trajectory states
- [x] Add business-level trajectory synthesis using health, situations, opportunities, decisions, cross-signal relationships, strategic relevance, and freshness without duplicating upstream engines
- [x] Implement explainable early-warning and improving-condition detection with no false precision, certainty, or causal claims
- [x] Integrate trajectory context into strategy, decision, opportunity, situation, and monitoring/alert workflows without creating duplicate scoring or alert engines
- [x] Expose protected tRPC procedures for trajectory summaries, metric details, forecast snapshots/history, forecast-vs-actual comparison, refresh, and lifecycle/learning interactions with strict tenant authorization
- [x] Add Business Trajectory, Early Warnings, Short-Term Outlook, and observed-versus-projected detail visualization to DashboardV2
- [x] Add deterministic unit, persistence, forecast-learning, tenant-isolation, and integration tests covering trajectory, momentum, volatility, confidence, warnings, cross-signal context, snapshots, and forecast-vs-actual foundation
- [x] Run full test suite, TypeScript checks, and production build verification
- [x] Save Day 24 checkpoint and stop before Day 25
