# Roadmap: GeoPredict

## Overview

GeoPredict delivers a geopolitical event-driven price prediction system in 9 phases, following the data pipeline's natural flow: foundation infrastructure, then data sources (price, news, Twitter) layered incrementally, then intelligence layers (classification, sentiment), then prediction engine (Monte Carlo + MiroFish), and finally the presentation layers (dashboard, scenario management, reports). Each phase delivers a verifiable capability that the next phase depends on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project skeleton with event bus, SQLite storage, and config system
- [ ] **Phase 2: Price Feed** - Real-time and historical Binance price data flowing through the pipeline
- [ ] **Phase 3: News Ingestion** - Geopolitical news from curated RSS feeds with deduplication
- [ ] **Phase 4: Twitter Ingestion** - 4-tier Twitter/X cascade with self-hosted FxTwitter
- [ ] **Phase 5: Event Classification** - LLM-based event classifier with 5 categories and wildcard signals
- [ ] **Phase 6: Sentiment & Fundamentals** - Sentiment analysis on ingested text plus fundamental data context
- [ ] **Phase 7: Prediction Engine** - Dual prediction system (NumPy Monte Carlo + MiroFish) with cost controls
- [ ] **Phase 8: Dashboard** - Streamlit real-time dashboard with scenario visualization
- [ ] **Phase 9: Scenarios & Reporting** - Scenario persistence, accuracy tracking, reports, and alerts

## Phase Details

### Phase 1: Foundation
**Goal**: A running Python project with event bus backbone, SQLite persistence, and configuration system that all future components plug into
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Running Python 3.11-3.12 project with uv package management and all core dependencies installable
  2. Event bus publishes and subscribes to typed events, with events persisted to SQLite
  3. Configuration system loads API keys, search queries, and asset profiles from a config file
  4. System runs entirely on local Mac with no external server dependencies
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Price Feed
**Goal**: Real-time and historical TRUMP/USDT price and volume data flowing through the event bus into SQLite
**Depends on**: Phase 1
**Requirements**: INGEST-01, INGEST-02, FUND-01
**Success Criteria** (what must be TRUE):
  1. Real-time TRUMP/USDT price ticks arrive via Binance WebSocket and are visible as events on the bus
  2. Historical OHLCV data loads from Binance REST API to establish baseline context
  3. Trading volume and liquidity metrics are tracked and persisted alongside price data
  4. WebSocket reconnects automatically after disconnection with no silent data gaps
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: News Ingestion
**Goal**: Geopolitical news articles flow from curated RSS feeds through the event bus, deduplicated and stored
**Depends on**: Phase 1
**Requirements**: INGEST-03, INGEST-04
**Success Criteria** (what must be TRUE):
  1. System polls 5-10 curated geopolitical RSS feeds (Reuters, AP, Al Jazeera, etc.) on a configurable schedule
  2. Duplicate news events from multiple outlets are detected and collapsed into a single canonical event
  3. Ingested news events appear on the event bus in the same canonical format as other data sources
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Twitter Ingestion
**Goal**: Twitter/X data flows through a cost-optimized 4-tier cascade with self-hosted FxTwitter for rate limit control
**Depends on**: Phase 1
**Requirements**: INGEST-05, INGEST-06, INGEST-07, INGEST-08
**Success Criteria** (what must be TRUE):
  1. Self-hosted FxTwitter instance is deployed and serving tweet data as Tier 1
  2. 4-tier cascade (FxTwitter -> twitterapi.io -> X API v2 -> Grok 2/xAI) falls through tiers on failure, with most queries resolving at Tier 1 or 2
  3. User can configure tracked search queries (accounts, keywords, hashtags) without code changes
  4. Per-tier health monitoring alerts when a tier is down, and data freshness monitor flags stale results
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Event Classification
**Goal**: Raw ingested events are classified into geopolitical categories with impact scores, enabling intelligent routing to the prediction engine
**Depends on**: Phase 3, Phase 4 (needs raw events to classify)
**Requirements**: CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, CLASS-06
**Success Criteria** (what must be TRUE):
  1. Every ingested event is classified into one of 5 categories (Military/Conflict, Policy/Regulation, Political Drama, Economic Signals, Wildcard) with a 1-10 impact score
  2. Classification uses Claude API with structured output, batched in 30-second windows to control costs
  3. Wildcard category tracks memes and viral narratives with a configurable weight (0-100%)
  4. User can toggle wildcard signals on/off without affecting other categories
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Sentiment & Fundamentals
**Goal**: Ingested text has sentiment scores and predictions receive fundamental data context as a reality check
**Depends on**: Phase 2, Phase 5 (needs classified events and price data)
**Requirements**: SENT-01, SENT-02, SENT-03, FUND-02, FUND-03
**Success Criteria** (what must be TRUE):
  1. Ingested text is scored into discrete sentiment buckets (very negative to very positive) using Claude API with pinned model version and temperature=0
  2. Sentiment results are cached per content item to avoid redundant API calls
  3. Volume and liquidity baseline data is available to the prediction engine as a reality check (prevents physically impossible predictions)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Prediction Engine
**Goal**: The system generates probability-weighted scenario trajectories for significant events using fast Monte Carlo and deep MiroFish simulation
**Depends on**: Phase 5, Phase 6 (needs classified, sentiment-scored events with fundamental context)
**Requirements**: PRED-01, PRED-02, PRED-03, PRED-04, PRED-05, PRED-06, PRED-07, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. For each significant event, the system produces minimum 3 scenario trajectories (bull/base/bear) with probability weights, price paths, confidence intervals, and key assumptions
  2. NumPy Monte Carlo generates short-term predictions (1-24 hours) in under 5 seconds
  3. MiroFish multi-agent simulation generates deep multi-day scenarios (1-7 days), gated by event significance threshold to control compute costs
  4. Different event types produce different temporal impact profiles (shocks = minutes, developments = hours/days)
  5. Daily token/API budget limits prevent cost blowouts, and MiroFish outputs are normalized against known benchmarks
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD

### Phase 8: Dashboard
**Goal**: A real-time Streamlit dashboard visualizes price data, events, scenarios, and system health in one view
**Depends on**: Phase 7 (needs predictions and scenarios to display)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. Real-time candlestick price chart for TRUMP/USDT updates without manual refresh
  2. Live event feed shows classified events with their impact scores and categories
  3. Scenario visualization overlays 3-5 price trajectories with probability labels on the price chart
  4. Event-to-price causal chain is visible (why a prediction was made)
  5. Data source health indicators show heartbeat status for each ingestion source, and wildcard weight slider/toggle is functional
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Scenarios & Reporting
**Goal**: Predictions are persisted, tracked against reality, and communicated through generated reports and alerts
**Depends on**: Phase 7, Phase 8 (needs predictions flowing and dashboard for notifications)
**Requirements**: SCEN-01, SCEN-02, SCEN-03, SCEN-04, REPT-01, REPT-02, REPT-03
**Success Criteria** (what must be TRUE):
  1. All generated scenarios are persisted with timestamps, source events, and full input/output logs
  2. Actual price is overlaid on predicted trajectories, and the system highlights which scenario is tracking closest to reality
  3. Natural language reports are generated with reasoning, confidence levels, and invalidation conditions
  4. User receives browser-based dashboard notifications when event impact score exceeds a configurable threshold

**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
Note: Phases 2, 3, 4 can execute in parallel (all depend only on Phase 1).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Price Feed | 0/1 | Not started | - |
| 3. News Ingestion | 0/1 | Not started | - |
| 4. Twitter Ingestion | 0/2 | Not started | - |
| 5. Event Classification | 0/2 | Not started | - |
| 6. Sentiment & Fundamentals | 0/2 | Not started | - |
| 7. Prediction Engine | 0/3 | Not started | - |
| 8. Dashboard | 0/2 | Not started | - |
| 9. Scenarios & Reporting | 0/2 | Not started | - |
