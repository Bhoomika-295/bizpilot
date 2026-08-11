# BizPilot AI — Day 2 TODO

## Phase 1: Inspect Day 1 & Identify Reusable Components
- [x] Review existing database schema
- [x] Review existing API structure
- [x] Review existing frontend components
- [x] Identify authorization patterns
- [x] Plan reuse strategy

## Phase 2: Business Data Service
- [x] Create businessDataService.ts with authorization checks
- [x] Implement verifyBusinessOwnership function
- [x] Implement transaction data access (date-ranged)
- [x] Implement expense data access (date-ranged)
- [x] Implement customer data access
- [x] Implement product data access
- [x] Implement data statistics functions
- [x] Add getLastTransactionDate for freshness

## Phase 3: Business Metric Engine
- [x] Create businessMetricEngine.ts
- [x] Implement calculateBusinessMetrics function
- [x] Calculate revenue with period comparison
- [x] Calculate expenses with period comparison
- [x] Calculate estimated profit
- [x] Calculate transaction metrics
- [x] Calculate customer metrics (active/inactive)
- [x] Calculate average transaction value
- [x] Implement calculateBusinessHealthScore function
- [x] Create transparent health score methodology
- [x] Implement insufficient data handling
- [x] Implement getDataFreshness function

## Phase 4: Time Period Filter
- [x] Create businessMetrics tRPC router
- [x] Implement getMetrics procedure
- [x] Implement getHealthScore procedure
- [x] Implement getDataFreshness procedure
- [x] Implement getMetricsMultiPeriod procedure
- [x] Support Last 30 Days period
- [x] Support Previous 30 Days period
- [x] Register router in appRouter

## Phase 5: Comparison System
- [x] Create visual comparison indicators in UI
- [x] Implement trending up/down icons
- [x] Show percentage change with direction
- [x] Display absolute change values
- [x] Add period-over-period labels

## Phase 6: Business Health Score
- [x] Implement 0-100 scoring system
- [x] Create transparent methodology
- [x] Add revenue trend factor (0-25 points)
- [x] Add expense trend factor (0-25 points)
- [x] Add customer activity factor (0-25 points)
- [x] Add transaction activity factor (0-25 points)
- [x] Implement insufficient data messaging
- [x] Generate human-readable explanations

## Phase 7: Data Status Section
- [x] Create data freshness tracking
- [x] Show last transaction date
- [x] Show transaction count
- [x] Show customer count
- [x] Show product count
- [x] Show expense count
- [x] Indicate data freshness (today/yesterday/this week/this month/older)

## Phase 8: Business Briefing
- [x] Create DashboardV2 component
- [x] Display real calculated metrics
- [x] Show business health score
- [x] Display revenue metrics
- [x] Display expense metrics
- [x] Display profit metrics
- [x] Display transaction metrics
- [x] Display customer metrics
- [x] Generate business signals from data

## Phase 9: Business Signals
- [x] Create internal business signals section
- [x] Generate revenue trend signals
- [x] Generate transaction volume signals
- [x] Generate expense trend signals
- [x] Generate customer activity signals
- [x] Label as "Internal Business Signals"
- [x] Distinguish from external market signals

## Phase 10: Customer & Transaction Data
- [x] Enhance customer list with transaction metrics
- [x] Show total purchases per customer
- [x] Show transaction count per customer
- [x] Show last transaction date
- [x] Show customer activity status
- [ ] Create customer detail view
- [x] Show transaction history in clean table
- [ ] Add pagination if needed
- [ ] Add sorting if needed

## Phase 11: Security Review
- [x] Verify all endpoints require authentication
- [x] Verify authorization checks on business access
- [ ] Test cross-tenant access denial
- [x] Verify client-supplied businessId validation
- [x] Check database query scoping
- [x] Verify input validation
- [x] Check error messages don't expose internals
- [x] Verify no secrets in frontend
- [x] Verify no hardcoded API keys
- [x] Verify environment variables server-side only

## Phase 12: UI Polish
- [x] Verify premium visual design
- [x] Check typography and spacing
- [x] Verify information hierarchy
- [x] Check responsive design
- [x] Verify no neon/glowing borders
- [x] Verify no excessive animations
- [x] Check color consistency
- [x] Verify trustworthy appearance

## Phase 13: Testing
- [ ] Test login flow
- [ ] Test business dashboard load
- [ ] Test metrics calculation
- [ ] Add transaction and verify metrics update
- [ ] Add expense and verify metrics update
- [ ] Test period filter changes
- [ ] Test insufficient data state
- [ ] Test unauthorized access
- [ ] Test CSV import updates metrics
- [ ] Test data persistence
- [ ] Test logout/login persistence

## Phase 14: Final Quality Check
- [ ] Verify metrics are from real database
- [ ] Verify calculations are deterministic
- [ ] Verify authorization is enforced
- [ ] Verify UI is premium and distinctive
- [ ] Verify no hardcoded demo data in metrics
- [ ] Verify data quality indicators present
- [ ] Verify insufficient data messaging
- [ ] Verify code is maintainable
- [ ] Verify feature is extensible
- [ ] Verify no secrets exposed
