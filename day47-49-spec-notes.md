# Day 47–49 Decision Intelligence & Strategy Adaptation v2 — Requirements Notes

Source: `/home/ubuntu/upload/pasted_content_36.txt`.

## Scope
Preserve Days 1–46. Do not duplicate existing intelligence engines. Build the flow: what happened → why it matters → what could happen → options → trade-offs → what to consider → decision → aftermath → learning.

## Day 47
Provide structured decision context: decision, why it matters, current situation, evidence, trend, strategic context, risks, opportunities, historical context, and possible outcomes. Reuse evidence-backed Why Now infrastructure. Provide context-appropriate editable decision options and option comparison fields: expected benefit, potential risk, strategic alignment, evidence, historical precedent, dependencies, unknown factors, and potential outcome. Use “Insufficient evidence.” when evidence is absent. Show separate qualitative confidence for evidence, forecast, historical relevance, and decision confidence. Distinguish similar from identical historical decisions.

## Day 48
Connect decision → selected option → strategy change → existing strategy version → expected outcome → execution → observed outcome → learning. Require an explicit human approval before creating a strategy version or changing an active strategy. Persist finalized decisions with context, evidence, options, selected option, reasoning, expected outcome, risks, timestamp, decision maker, related strategy/situation/signals, and historical evidence. Link decisions to existing outcomes and show expected vs actual outcome without claiming success/failure without evidence. Provide explainable decision-quality dimensions.

## Day 49
When outcomes are available, generate structured learning: expected, actual, difference, supported/unknown cause, lesson, and applicability. Feed lessons through existing Business Memory and Pattern Intelligence only when evidence exists. Provide a source-linked decision timeline: situation → decision created → options → decision made → strategy changed → action executed → outcome observed → learning recorded. Integrate high-value decisions into Command Center under “Decisions That Matter” and add a concise “Decisions Required” Executive Brief section.

## Security and architecture
All decisions, options, strategies, outcomes, memories, patterns, and AI context must be tenant isolated. Never trust client businessId; authorize every source. Use UI → tRPC → services → database. AI may summarize verified evidence only and must not invent evidence, outcomes, causes, or make/approve decisions. Deterministic fallback is required.

## Verification
Add tests for context, Why Now, options, comparisons, trade-offs, confidence, history, strategy preview/approval/versioning, decision persistence, outcomes, learning, patterns, memory relevance, timeline, Command Center and Brief integration, AI fallback/isolation, tenant authorization, and cross-tenant prevention. Run existing and new tests, TypeScript, build, authorization/security, human approval, Command Center/Brief, and responsive UI checks. Do not implement exports, notification preferences, saved briefing views, or Day 50.
