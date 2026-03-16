# GeoPredict

## What This Is

A real-time geopolitical event-driven price prediction system that generates multiple scenario simulations for crypto assets. It ingests live data streams — tweets, news, opinions, price feeds, and economic indicators — to model how different geopolitical outcomes would affect asset prices. Launching with TRUMP meme coin as the primary target, built on MiroFish's financial prediction framework.

## Core Value

Generate accurate, probability-weighted price scenario simulations that show how different geopolitical outcomes (escalation, ceasefire, policy change, viral narrative) would move an asset's price across multiple timeframes.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Ingest real-time price data from Binance API (TRUMP/USDT and configurable pairs)
- [ ] 4-tier Twitter/X data cascade: FxTwitter → twitterapi.io → X API v2 → Grok 2/xAI
- [ ] News ingestion from RSS feeds and news APIs for geopolitical events
- [ ] Event classification engine: Military/Conflict, Policy/Regulation, Political Drama, Economic Signals, Wildcard (memes, viral narratives, "schizo posts")
- [ ] Wildcard signal category with configurable weight and on/off toggle
- [ ] Sentiment analysis on ingested text data (hybrid AI: Claude API initially, GPT-OS-120B later)
- [ ] MiroFish integration for financial time-series prediction
- [ ] Scenario simulation engine: generate N probability-weighted price trajectories per event
- [ ] Short-term predictions (1-24 hours) for trading signals
- [ ] Multi-day predictions (1-7 days) for positioning
- [ ] Real-time dashboard with scenario visualization (price path charts per outcome)
- [ ] Generated text reports with scenario breakdowns, confidence levels, and reasoning
- [ ] Asset-agnostic architecture (TRUMP first, swappable to BTC/ETH/any)
- [ ] Self-hosted FxTwitter instance for rate limit control
- [ ] Fundamental analysis layer: on-chain data, volume, liquidity metrics

### Out of Scope

- Automated trading/execution — this is analysis and prediction only
- Mobile app — web dashboard only
- Multi-user auth — single-user local system
- Historical backtesting UI — may come in v2 but not v1
- Portfolio management — focused on single-asset scenario analysis

## Context

**MiroFish (github.com/666ghj/MiroFish):** Open-source financial prediction framework. User has explored but not run it. Will serve as the core prediction engine, extended with geopolitical event features.

**Current geopolitical context:** Iran-US-Israel conflict is the primary use case. TRUMP meme coin chosen specifically because its price has near-direct correlation with political events and Trump-related sentiment, making it an ideal testbed for geopolitical price prediction.

**Why TRUMP over BTC:** Meme coins amplify political signal. Bitcoin reacts to macro events but with many confounding factors. TRUMP is a purer signal — political events move it directly and dramatically.

**Wildcard signals:** Memes, "schizo posts," esoteric content, and viral narratives that gain traction on X. These are disproportionately influential for meme coin prices. Must be trackable with configurable weighting (and ability to disable entirely).

**Twitter/X data strategy:** 4-tier cost-optimized cascade. Most queries should resolve at Tier 1 (FxTwitter, free) or Tier 2 (twitterapi.io, $0.15/1K tweets). Official X API v2 and Grok 2/xAI are last resorts.

**AI strategy:** Claude API for initial development and testing. GPT-OS-120B to be integrated later as a secondary/alternative model. Hybrid approach allows cost optimization and model comparison.

## Constraints

- **Runtime**: Must run entirely on local Mac
- **Cost**: Minimize API costs — Twitter cascade prioritizes free/cheap tiers
- **AI Models**: Claude API for v1, GPT-OS-120B integration planned for v2
- **Base Framework**: Build on MiroFish — extend, don't rewrite
- **Data Sources**: No paid premium data subscriptions — use free/cheap APIs (Binance, FxTwitter, RSS)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TRUMP as primary asset | Direct geopolitical correlation, amplified signal vs BTC | — Pending |
| MiroFish as prediction base | Existing financial prediction framework, avoid building from scratch | — Pending |
| 4-tier Twitter cascade | Cost optimization: free → $0.15/1K → official → AI fallback | — Pending |
| Self-host FxTwitter | Control rate limits, avoid dependency on public instance | — Pending |
| Claude API for v1 AI | Available immediately, GPT-OS-120B added later | — Pending |
| Asset-agnostic architecture | TRUMP first but designed to swap assets easily | — Pending |
| Wildcard signal category | Meme/viral content is material for meme coin pricing | — Pending |

---
*Last updated: 2026-03-16 after initialization*
