# Requirements: GeoPredict

**Defined:** 2026-03-16
**Core Value:** Generate accurate, probability-weighted price scenario simulations showing how different geopolitical outcomes move an asset's price across multiple timeframes.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Ingestion

- [ ] **INGEST-01**: System ingests real-time TRUMP/USDT price and volume data via Binance WebSocket
- [ ] **INGEST-02**: System ingests historical OHLCV data from Binance REST API for baseline context
- [ ] **INGEST-03**: System ingests geopolitical news from 5-10 curated RSS feeds (Reuters, AP, Al Jazeera, etc.)
- [ ] **INGEST-04**: System deduplicates news events (same event from multiple outlets counted once)
- [ ] **INGEST-05**: System ingests tweets via 4-tier cascade: FxTwitter → twitterapi.io → X API v2 → Grok 2/xAI
- [ ] **INGEST-06**: Cascade prioritizes free/cheap tiers — most queries resolve at Tier 1 or 2
- [ ] **INGEST-07**: Self-hosted FxTwitter instance deployed for rate limit control
- [ ] **INGEST-08**: System tracks configurable Twitter search queries (accounts, keywords, hashtags)

### Event Classification

- [ ] **CLASS-01**: System classifies events into 5 categories: Military/Conflict, Policy/Regulation, Political Drama, Economic Signals, Wildcard
- [ ] **CLASS-02**: Classification uses Claude API with structured output for consistent taxonomy
- [ ] **CLASS-03**: System assigns geopolitical impact score (1-10) to each classified event
- [ ] **CLASS-04**: Wildcard category tracks memes, viral narratives, and "schizo posts" with configurable weight (0-100%)
- [ ] **CLASS-05**: User can toggle wildcard signal category on/off without affecting other categories
- [ ] **CLASS-06**: System batches classification calls (30-second windows) to control API costs

### Sentiment Analysis

- [ ] **SENT-01**: System scores sentiment on ingested text using Claude API (discrete buckets: very negative, negative, neutral, positive, very positive)
- [ ] **SENT-02**: Sentiment results are cached to avoid redundant API calls on duplicate/similar content
- [ ] **SENT-03**: Sentiment uses pinned model version to reduce non-determinism across runs

### Prediction Engine

- [ ] **PRED-01**: System generates multiple probability-weighted scenario trajectories per significant event (minimum 3: bull/base/bear)
- [ ] **PRED-02**: NumPy Monte Carlo engine generates fast short-term predictions (1-24 hours)
- [ ] **PRED-03**: MiroFish multi-agent simulation generates deep multi-day scenario analysis (1-7 days)
- [ ] **PRED-04**: Each scenario includes probability weight, price trajectory, confidence interval, and key assumptions
- [ ] **PRED-05**: System accounts for different temporal impact profiles per event type (shocks = minutes, developments = hours/days)
- [ ] **PRED-06**: MiroFish runs are gated by event significance threshold to control compute/token costs
- [ ] **PRED-07**: Prediction engine is asset-agnostic — asset profiles define which event categories matter and with what weight

### Fundamental Analysis

- [ ] **FUND-01**: System tracks trading volume and liquidity metrics from Binance API
- [ ] **FUND-02**: System provides volume/liquidity baseline context to prediction engine as reality check
- [ ] **FUND-03**: Fundamental data prevents predictions that are physically impossible (e.g., 10x pump with no liquidity)

### Scenario Management

- [ ] **SCEN-01**: System persists all generated scenarios with timestamps and source events
- [ ] **SCEN-02**: System overlays actual price on predicted trajectories (scenario comparison timeline)
- [ ] **SCEN-03**: System highlights which scenario is tracking closest to reality as events unfold
- [ ] **SCEN-04**: All predictions are logged with inputs, outputs, and timestamps for accuracy tracking

### Dashboard

- [ ] **DASH-01**: Real-time price chart with candlesticks for TRUMP/USDT
- [ ] **DASH-02**: Live event feed showing classified events with impact scores
- [ ] **DASH-03**: Scenario visualization: 3-5 overlaid price trajectories with probability labels
- [ ] **DASH-04**: Event-to-price causal chain visualization (why a prediction was made)
- [ ] **DASH-05**: Data source health indicators (heartbeat status for each source)
- [ ] **DASH-06**: Wildcard signal weight slider and on/off toggle in UI

### Reports & Alerts

- [ ] **REPT-01**: System generates natural language scenario reports with reasoning, confidence levels, and invalidation conditions
- [ ] **REPT-02**: Configurable alert thresholds — notify when event impact score exceeds user-set level
- [ ] **REPT-03**: Dashboard notifications for significant events (browser-based)

### Infrastructure

- [ ] **INFRA-01**: System runs entirely on local Mac
- [ ] **INFRA-02**: SQLite for persistent storage (events, predictions, scenarios, price data)
- [ ] **INFRA-03**: Event bus architecture for decoupled component communication
- [ ] **INFRA-04**: Configuration system for API keys, search queries, alert thresholds, and asset profiles
- [ ] **INFRA-05**: MiroFish calibration layer — normalize outputs against known benchmarks (Brier scores)
- [ ] **INFRA-06**: Daily token/API budget limits to prevent cost blowouts

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Asset

- **MULTI-01**: Support BTC/ETH alongside TRUMP with separate asset profiles
- **MULTI-02**: Cross-asset correlation analysis (how geopolitical events move multiple assets differently)

### AI Models

- **AI-01**: GPT-OS-120B integration as alternative/secondary model to Claude
- **AI-02**: Model comparison mode (run same scenario through Claude + GPT-OS-120B, compare outputs)

### Analytics

- **ANLYT-01**: Accuracy statistics dashboard after 30+ days of prediction history
- **ANLYT-02**: Export predictions and outcomes as CSV for offline analysis

### Sharing

- **SHARE-01**: Export reports as PDF/HTML for sharing
- **SHARE-02**: Telegram/Discord webhook for alerts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated trade execution | Catastrophic risk — geopolitical events are inherently unpredictable. One black swan wipes out accounts. |
| Sub-second price updates | Geopolitical events unfold over hours/days. HFT latency is irrelevant and wastes compute. |
| Historical backtesting UI | TRUMP has ~14 months of data. Not enough for meaningful backtests. Forward-testing is more honest. |
| Multi-user auth | Single-user local system. No auth needed. |
| Mobile app | Web dashboard only. |
| 50+ simultaneous assets | Doing 50 assets poorly is worse than 1-3 well. Validate on TRUMP first. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INGEST-01 | Phase 2: Price Feed | Pending |
| INGEST-02 | Phase 2: Price Feed | Pending |
| INGEST-03 | Phase 3: News Ingestion | Pending |
| INGEST-04 | Phase 3: News Ingestion | Pending |
| INGEST-05 | Phase 4: Twitter Ingestion | Pending |
| INGEST-06 | Phase 4: Twitter Ingestion | Pending |
| INGEST-07 | Phase 4: Twitter Ingestion | Pending |
| INGEST-08 | Phase 4: Twitter Ingestion | Pending |
| CLASS-01 | Phase 5: Event Classification | Pending |
| CLASS-02 | Phase 5: Event Classification | Pending |
| CLASS-03 | Phase 5: Event Classification | Pending |
| CLASS-04 | Phase 5: Event Classification | Pending |
| CLASS-05 | Phase 5: Event Classification | Pending |
| CLASS-06 | Phase 5: Event Classification | Pending |
| SENT-01 | Phase 6: Sentiment & Fundamentals | Pending |
| SENT-02 | Phase 6: Sentiment & Fundamentals | Pending |
| SENT-03 | Phase 6: Sentiment & Fundamentals | Pending |
| PRED-01 | Phase 7: Prediction Engine | Pending |
| PRED-02 | Phase 7: Prediction Engine | Pending |
| PRED-03 | Phase 7: Prediction Engine | Pending |
| PRED-04 | Phase 7: Prediction Engine | Pending |
| PRED-05 | Phase 7: Prediction Engine | Pending |
| PRED-06 | Phase 7: Prediction Engine | Pending |
| PRED-07 | Phase 7: Prediction Engine | Pending |
| FUND-01 | Phase 2: Price Feed | Pending |
| FUND-02 | Phase 6: Sentiment & Fundamentals | Pending |
| FUND-03 | Phase 6: Sentiment & Fundamentals | Pending |
| SCEN-01 | Phase 9: Scenarios & Reporting | Pending |
| SCEN-02 | Phase 9: Scenarios & Reporting | Pending |
| SCEN-03 | Phase 9: Scenarios & Reporting | Pending |
| SCEN-04 | Phase 9: Scenarios & Reporting | Pending |
| DASH-01 | Phase 8: Dashboard | Pending |
| DASH-02 | Phase 8: Dashboard | Pending |
| DASH-03 | Phase 8: Dashboard | Pending |
| DASH-04 | Phase 8: Dashboard | Pending |
| DASH-05 | Phase 8: Dashboard | Pending |
| DASH-06 | Phase 8: Dashboard | Pending |
| REPT-01 | Phase 9: Scenarios & Reporting | Pending |
| REPT-02 | Phase 9: Scenarios & Reporting | Pending |
| REPT-03 | Phase 9: Scenarios & Reporting | Pending |
| INFRA-01 | Phase 1: Foundation | Pending |
| INFRA-02 | Phase 1: Foundation | Pending |
| INFRA-03 | Phase 1: Foundation | Pending |
| INFRA-04 | Phase 1: Foundation | Pending |
| INFRA-05 | Phase 7: Prediction Engine | Pending |
| INFRA-06 | Phase 7: Prediction Engine | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-17 after roadmap creation*
