# Day 28 External World Intelligence & Early-Warning Radar v1

Source: `/home/ubuntu/upload/pasted_content_26.txt` (user-provided requirement attachment; no external URLs).

## Product objective
Extend existing market and competitor intelligence into an evidence-traceable external-world radar. The flow must be external event -> deterministic business relevance -> impact and affected areas -> internal trajectory/cross-signal context -> strategy/objective/scenario context -> human review. Do not build duplicate alert, competitor, market, recommendation, or learning engines; do not fabricate live events or sources; do not make unsupported causal claims.

## Core model and rules
External events preserve businessId, source/sourceType, title, summary, reference URL, published/detected timestamps, topic/entities/geography, extensible eventType, evidence strength, freshness, status, and created/updated timestamps. Event status includes NEW, REVIEWED, RELEVANT, IRRELEVANT, MONITORING, RESOLVED, and ARCHIVED. Practical normalization may match entity, event type, time proximity, and normalized title/topic.

Deterministic relevance uses business profile, industry/category, products, competitors, strategy/objectives, metrics, situations, opportunities, and market context. Every relevant event needs a why-it-matters explanation. Impact types are OPPORTUNITY, THREAT, CONSTRAINT, CONTEXT_CHANGE, NEUTRAL, or UNKNOWN, with evidence-supported impact areas. Strategy impact and objective impact must use Day 27 strategy health context; trajectory and cross-signal interaction must use Day 24 and Day 23 outputs with cautious language such as may/could/appears relevant.

Repeated related events form trends with EMERGING, STRENGTHENING, STABLE, WEAKENING, RESOLVED, or UNKNOWN states and LOW/MEDIUM/HIGH/INSUFFICIENT_DATA confidence. Early warnings require external change + business relevance + meaningful internal context. Opportunity and threat radar must be evidence-based and must not auto-create business actions.

## Required integrations and UX
Use Day 25 scenario context, Day 26 business learning, Day 27 strategy health, existing clusters, monitoring, and Strategy Copilot context. Provide external timeline, intelligence clusters, source quality, freshness, conflicting external evidence, internal-vs-external comparison, why-now, what-changed, and watch-items sections. Add a premium External Radar dashboard section and detail modal showing source, published/detected times, evidence, affected areas/objectives/strategy, internal/external signals, trend, uncertainty, learning, scenarios, and watch items. User controls include mark relevant/irrelevant, monitor, archive, create opportunity review, and create strategy review; feedback is tenant-scoped and never changes source truth.

## AI and freshness constraints
AI may summarize verified structured context but must not determine event reality, relevance, impact, trend existence, source quality, or strategy impact. Do not claim real-time intelligence without a live source connection; show LAST UPDATED/LAST CHECKED and build deterministic processing around existing stored intelligence when external connections are unavailable. Never fabricate events, URLs, source quality, or certainty.

## Security and tests
Maintain strict tenant isolation for event evaluations, metadata, feedback, strategy/scenario/opportunity/alert links, authenticated mutations, server-side authorization of client IDs, server-side credentials, and logs. Deterministic tests must cover event creation/normalization/status/traceability, relevance and explanations, impact/areas, strategy/objective/trajectory/cross-signal interaction, trend and confidence, early warnings, opportunity/threat radar, why-now/watch items, strategy/scenario/learning integration, timeline/clusters/source quality/freshness/conflict/internal-vs-external, feedback, tenant authorization, full historical suite, and production build. If authenticated visual verification is unavailable, use automated, persistence, authorization, and production-build evidence without requesting Google credentials.

## Non-goals
No web crawling or distributed scraping infrastructure, autonomous agents/actions, reinforcement learning, neural networks, complex ML ranking, email/WhatsApp/CRM/payments/mobile app, or unrelated redesign.

## Source
User attachment: `/home/ubuntu/upload/pasted_content_26.txt`.
