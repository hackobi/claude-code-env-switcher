# Feature Research

**Domain:** Geopolitical event-driven crypto price prediction
**Researched:** 2026-03-16
**Confidence:** MEDIUM — well-established individual domains (sentiment analysis, price prediction, scenario simulation) but the specific combination of geopolitical event classification + meme coin scenario trajectories is novel territory

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any credible prediction/analysis system must have. Without these, the system feels like a toy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time price feed ingestion | Cannot predict prices without current prices. Binance WebSocket is the standard. | LOW | Binance API is well-documented. TRUMP/USDT pair. Use WebSocket for live, REST for historical. |
| Social media sentiment analysis | Every crypto analysis tool does this (Santiment, LunarCrush, Augmento). Users expect social signal. | MEDIUM | 4-tier Twitter cascade already planned. Need to extract sentiment scores, not just raw text. |
| News event ingestion | Geopolitical events are the core signal. Without news feed, no event-driven prediction. | MEDIUM | RSS feeds + news APIs. Must handle deduplication — same event reported by dozens of outlets. |
| Event classification/categorization | Raw text is useless without categorization. Users need to know what TYPE of event is driving price. | HIGH | 5-category taxonomy (Military/Conflict, Policy/Regulation, Political Drama, Economic Signals, Wildcard). LLM-based classification with structured output. |
| Price prediction with confidence intervals | Single-point predictions are misleading. Must show ranges/probabilities. Industry standard since Monte Carlo became accessible. | HIGH | MiroFish handles multi-agent simulation. Output must be probability distributions, not single numbers. |
| Dashboard with price charts | Every trading/analysis tool has real-time price visualization. Candlesticks + overlays are expected. | MEDIUM | Next.js dashboard. Use lightweight charting library (lightweight-charts by TradingView is free and fast). |
| Configurable alert thresholds | Users need to know when significant events are detected without staring at the screen. | LOW | Simple threshold system — notify when event impact score exceeds configurable level. |
| Data source health monitoring | Users must know when a data source is down or degraded. Silent failures destroy trust. | LOW | Heartbeat checks for each data source. Status indicator on dashboard. |

### Differentiators (Competitive Advantage)

Features that set GeoPredict apart from generic sentiment tools and price predictors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-scenario simulation with branching outcomes | Existing tools give one prediction. GeoPredict shows "if ceasefire, price goes here; if escalation, price goes there." This is the core differentiator — scenario trees, not single forecasts. | HIGH | MiroFish's multi-agent simulation enables this. Each scenario gets independent agent population with different assumptions. Output: N probability-weighted price trajectories. |
| Geopolitical event impact scoring | No existing crypto tool specifically classifies and scores geopolitical events by predicted price impact. Santiment/LunarCrush track social buzz, not geopolitical significance. | HIGH | LLM-based impact assessment. Requires geopolitical context window — model needs to understand what Iran-Israel escalation means for TRUMP coin specifically, not just "negative news." |
| Wildcard signal tracking (memes, viral narratives, "schizo posts") | Meme coins are moved by memes. No institutional tool tracks this. GeoPredict explicitly models viral/esoteric content as a price signal with configurable weight. | MEDIUM | Dedicated signal category. Configurable weight slider (0-100%). Toggle on/off. Tracks engagement velocity, not just content. |
| Event-to-price causal chain visualization | Show WHY a prediction was made. "Iran strike detected -> Military/Conflict category -> Historical correlation: -12% avg -> Scenario A: further escalation -> -18% projection." Explainability is rare in prediction tools. | MEDIUM | Render the reasoning chain from event detection through classification to price impact. Users can audit the logic. |
| Asset-agnostic event mapping | Same event classification engine can be pointed at any asset. TRUMP first, but the geopolitical event taxonomy applies to BTC, ETH, oil, gold. Reusable intelligence layer. | MEDIUM | Architecture decision — event classification must be decoupled from asset-specific price modeling. Asset profiles define which event categories matter and with what weight. |
| Scenario comparison timeline | Side-by-side view of 3-5 scenarios playing out over time. As real events unfold, highlight which scenario is tracking closest to reality. "Living" prediction that updates as ground truth emerges. | HIGH | Requires scenario persistence, real-time comparison scoring, and UI for overlaying actual price on predicted trajectories. |
| Generated text reports with reasoning | Natural language scenario breakdown: "Scenario A (45% probability): If US-Iran talks resume, expect TRUMP to recover to $X within 48h because..." AI-generated analysis, not just charts. | MEDIUM | LLM generates report from simulation outputs. Include confidence levels, key assumptions, and what would invalidate the prediction. |
| Fundamental layer (on-chain + liquidity) | On-chain holder distribution, liquidity pool depth, volume profiles as baseline context for geopolitical overlays. Prevents "event says up, but no liquidity to support it." | MEDIUM | Binance API provides volume/orderbook. On-chain data via free Solana RPC for TRUMP token. Adds reality check to event-driven predictions. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automated trade execution | "If the system predicts, why not trade?" | Catastrophic risk. Geopolitical events are inherently unpredictable. One black swan wipes out the account. Also: regulatory, liability. PROJECT.md explicitly excludes this. | Display signals with confidence levels. User decides. Maybe add "copy to clipboard" for order parameters at most. |
| Real-time everything (sub-second updates) | "Faster = better for trading." | Geopolitical events unfold over hours/days, not milliseconds. Sub-second updates waste compute, create noise, and cause analysis paralysis. Meme coin price feeds don't need HFT latency. | 30-second price refresh. Event detection on 1-5 minute polling cycles. Scenario regeneration on-demand or when significant new event detected. |
| Backtesting UI with interactive replay | "Prove it works on historical data." | Massive engineering effort. Historical geopolitical event data is hard to source and label. Overfitting risk — past geopolitical patterns may not predict future ones. Backtesting meme coins is nearly meaningless — TRUMP has existed for ~1 year. | Log predictions and outcomes. After 30+ days of operation, show accuracy stats. Simple CSV export for offline analysis if users want to backtest manually. |
| Multi-user collaboration / sharing | "Teams should see the same analysis." | Adds auth, permissions, real-time sync — none of which helps the prediction quality. This is a single-user local system. | Single-user local system. Export reports as PDF/HTML if sharing needed. |
| Coverage of 50+ assets simultaneously | "Monitor the whole market." | Spreads event analysis thin. Geopolitical event impact is highly asset-specific. Doing 50 assets poorly is worse than 1-3 assets well. | Start with TRUMP. Add BTC/ETH when event-to-price mapping is validated. Asset profiles allow expansion without code changes. |
| Historical backtesting with paper trading | "Simulate past trades to validate strategy." | TRUMP coin launched January 2025. ~14 months of data. Not enough for statistically meaningful backtesting. Geopolitical regimes shift — 2025 Iran-US dynamics differ from 2023. | Forward-testing: run predictions live, track accuracy, improve. More honest than cherry-picked backtests. |
| Telegram/Discord bot integration | "I want alerts on my phone." | Adds deployment complexity, message formatting, API management. Distracts from core prediction quality. | Dashboard notifications + browser push notifications. If someone really wants Telegram, it's a simple webhook — add in v2. |

## Feature Dependencies

```
[Price Feed Ingestion (Binance WebSocket)]
    └──requires──> [Data Normalization Layer]
                       └──feeds into──> [MiroFish Prediction Engine]
                                            └──produces──> [Scenario Simulations]
                                                               └──renders as──> [Dashboard Visualization]

[Twitter/X Data Cascade]
    └──requires──> [Self-hosted FxTwitter]
    └──feeds into──> [Sentiment Analysis Engine]
                         └──feeds into──> [Event Classification]
                                              └──feeds into──> [MiroFish Prediction Engine]

[News RSS Ingestion]
    └──feeds into──> [Event Deduplication]
                         └──feeds into──> [Event Classification]

[Event Classification]
    └──requires──> [LLM Integration (Claude API)]
    └──produces──> [Geopolitical Impact Score]
                       └──feeds into──> [MiroFish Prediction Engine]

[Wildcard Signal Tracking]
    └──enhances──> [Event Classification] (optional category)
    └──requires──> [Twitter/X Data Cascade]

[Scenario Comparison Timeline]
    └──requires──> [Scenario Simulations]
    └──requires──> [Price Feed Ingestion] (for ground truth overlay)

[Generated Text Reports]
    └──requires──> [Scenario Simulations]
    └──requires──> [LLM Integration (Claude API)]

[Fundamental Layer]
    └──enhances──> [MiroFish Prediction Engine] (adds baseline context)
    └──requires──> [Price Feed Ingestion]
```

### Dependency Notes

- **Event Classification requires LLM Integration:** Classification taxonomy is too nuanced for rule-based approaches. Geopolitical events have context-dependent significance. Claude API is the best available option for structured classification with reasoning.
- **Scenario Simulations require both Price Feed and Event Classification:** MiroFish needs current market state (price, volume) combined with event signals to generate meaningful scenarios.
- **Wildcard Signal Tracking enhances Event Classification:** It is an optional 5th category. The system works without it (4 categories), but meme coin accuracy improves significantly with it enabled.
- **Self-hosted FxTwitter is a prerequisite for reliable Twitter ingestion:** Without it, Tier 1 of the cascade depends on a public instance that can go down or rate-limit at any time.
- **Dashboard Visualization depends on everything upstream:** It is the last layer. Cannot be built meaningfully until at least price feed + one event source + basic predictions are working.

## MVP Definition

### Launch With (v1)

Minimum viable product — enough to validate that geopolitical events can be mapped to meme coin price movements.

- [ ] **Binance price feed** — WebSocket connection for TRUMP/USDT real-time price and volume
- [ ] **News RSS ingestion** — 5-10 curated geopolitical news feeds (Reuters, AP, Al Jazeera, etc.)
- [ ] **Event classification engine** — Claude API-based classification into 5 categories with impact scores
- [ ] **Basic sentiment analysis** — Sentiment scoring on ingested text using Claude API
- [ ] **MiroFish integration** — Generate 3 scenario trajectories (bull/base/bear) per significant event
- [ ] **Simple dashboard** — Real-time price chart + event feed + scenario visualization (3 overlaid price paths)
- [ ] **Single Twitter/X source** — Start with FxTwitter (Tier 1) only, add cascade tiers later
- [ ] **Prediction logging** — Store all predictions with timestamps for accuracy tracking

### Add After Validation (v1.x)

Features to add once core event-to-price mapping is proven to have signal.

- [ ] **Full 4-tier Twitter cascade** — When Tier 1 rate limits are hit and more social data improves accuracy
- [ ] **Wildcard signal tracking** — When initial predictions miss moves caused by meme/viral content
- [ ] **Generated text reports** — When users want shareable analysis, not just charts
- [ ] **Event-to-price causal chain visualization** — When users ask "why did it predict this?"
- [ ] **Scenario comparison timeline** — When enough predictions exist to compare against reality
- [ ] **Configurable alerts** — When the system runs reliably enough to warrant notifications
- [ ] **Self-hosted FxTwitter** — When public instance reliability becomes a bottleneck

### Future Consideration (v2+)

Features to defer until the system proves its core thesis works.

- [ ] **Multi-asset support (BTC/ETH)** — Defer because event-to-price mapping needs validation on TRUMP first
- [ ] **GPT-OS-120B integration** — Defer because Claude API works and switching models mid-development adds complexity
- [ ] **Fundamental analysis layer** — Defer because on-chain data adds value only after event-driven predictions are baseline-accurate
- [ ] **Accuracy statistics dashboard** — Defer until 30+ days of prediction history exist
- [ ] **Export/sharing capabilities** — Defer until someone actually needs to share the output

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Binance price feed | HIGH | LOW | P1 |
| News RSS ingestion | HIGH | LOW | P1 |
| Event classification (LLM) | HIGH | HIGH | P1 |
| Basic sentiment analysis | MEDIUM | MEDIUM | P1 |
| MiroFish integration | HIGH | HIGH | P1 |
| Simple dashboard | HIGH | MEDIUM | P1 |
| Single Twitter/X source | MEDIUM | LOW | P1 |
| Prediction logging | MEDIUM | LOW | P1 |
| Full Twitter cascade | MEDIUM | MEDIUM | P2 |
| Wildcard signal tracking | MEDIUM | MEDIUM | P2 |
| Generated text reports | MEDIUM | LOW | P2 |
| Causal chain visualization | MEDIUM | MEDIUM | P2 |
| Scenario comparison timeline | HIGH | HIGH | P2 |
| Configurable alerts | LOW | LOW | P2 |
| Self-hosted FxTwitter | LOW | MEDIUM | P2 |
| Multi-asset support | MEDIUM | MEDIUM | P3 |
| GPT-OS-120B integration | LOW | MEDIUM | P3 |
| Fundamental analysis layer | MEDIUM | HIGH | P3 |
| Accuracy statistics | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for launch — core prediction loop (ingest -> classify -> predict -> display)
- P2: Should have — improves accuracy, explainability, and reliability
- P3: Nice to have — expands scope after core thesis is validated

## Competitor Feature Analysis

| Feature | Santiment | LunarCrush | Token Metrics | WAR Memecoin | GeoPredict (Ours) |
|---------|-----------|------------|---------------|--------------|-------------------|
| Social sentiment tracking | Yes (on-chain + social) | Yes (core product) | Yes | No (IS the signal) | Yes (4-tier cascade) |
| Geopolitical event classification | No | No | No | Implicit (price IS the index) | Yes (core differentiator) |
| Multi-scenario simulation | No | No | Single-point AI predictions | No | Yes (core differentiator) |
| Price predictions | No (analytics only) | Implied via Galaxy Score | Yes (AI-driven) | No | Yes (MiroFish) |
| On-chain analytics | Yes (core strength) | Basic | Yes | Solana chain | Planned for v2 |
| Wildcard/meme signal tracking | No | Social engagement only | No | Community-driven | Yes (dedicated category) |
| Event impact scoring | No | No | No | No | Yes (LLM-based) |
| Causal chain explainability | No | No | No | No | Yes (planned v1.x) |
| Real-time dashboard | Yes (web) | Yes (web + mobile) | Yes (web) | DEX chart only | Yes (web, single-user) |
| API access | GraphQL API | REST API | REST API | N/A | Local only (no API needed) |
| Cost | $49-$349/mo | Free tier + premium | $49-$99/mo | Free (buy the token) | Self-hosted, API costs only |

**Key insight:** No existing tool combines geopolitical event classification with scenario simulation for crypto. Santiment and LunarCrush are social sentiment tools — they track what people ARE saying, not what geopolitical events MEAN for prices. Token Metrics does AI predictions but without event-driven scenarios. WAR memecoin is interesting as a "tradable geopolitical index" but provides no analysis — it IS the market, not a tool for understanding it.

## Sources

- [Santiment API](https://api.santiment.net/) — on-chain, social, dev, and pricing data for 2000+ assets
- [LunarCrush API](https://lunarcrush.com/about/api) — social media analytics for crypto
- [MiroFish GitHub](https://github.com/666ghj/MiroFish) — multi-agent prediction engine
- [MiroFish Offline Fork](https://github.com/nikmcfly/MiroFish-Offline) — local deployment variant
- [Nansen: AI-Driven Tools in Crypto Trading 2025](https://www.nansen.ai/post/how-ai-driven-tools-are-transforming-crypto-trading-in-2025)
- [Nansen: Predictive Analytics Tools 2025](https://www.nansen.ai/post/how-predictive-analytics-tools-enhance-crypto-trading-decisions-in-2025)
- [Monte Carlo Simulation for Crypto Prices](https://arxiv.org/html/2405.12988v1)
- [Crypto.com: Prediction Markets Report](https://crypto.com/us/research/prediction-markets-oct-2025)
- [Santiment: Crypto 2025 Year in Review](https://app.santiment.net/insights/read/crypto-s-2025-year-in-review-a-rocky-geopolitical-rollercoaster-10398)
- [WAR Memecoin (Geopolitical Sentiment Index)](https://bingx.com/en/learn/article/what-is-war-crypto-politifi-memecoin-on-solana-how-to-buy)
- [Token Metrics AI Predictions](https://www.tokenmetrics.com/blog/cryptocurrency-price-predictions-and-forecasts-for-2025-a-deep-dive-with-token-metrics-ai)
- [Deep Learning and NLP in Crypto Forecasting](https://www.sciencedirect.com/science/article/pii/S0169207025000147)

---
*Feature research for: Geopolitical event-driven crypto price prediction (GeoPredict)*
*Researched: 2026-03-16*
