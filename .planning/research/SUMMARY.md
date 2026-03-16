# Project Research Summary

**Project:** GeoPredict
**Domain:** Geopolitical event-driven crypto price prediction (meme coin focus)
**Researched:** 2026-03-16
**Confidence:** MEDIUM

## Executive Summary

GeoPredict is a single-user, locally-run intelligence tool that ingests geopolitical news, Twitter/X sentiment, and Binance price feeds, feeds them through an LLM-based event classification pipeline, and drives multi-scenario price predictions for the TRUMP/USDT meme coin via MiroFish's multi-agent simulation engine. The category is novel — no existing tool combines geopolitical event classification with agent-based scenario simulation for meme coin prediction — but each individual component (sentiment analysis, Monte Carlo simulation, event classification, social media ingestion) is well-understood. The engineering challenge is integrating them reliably, not inventing new techniques.

The recommended approach is a layered Python-first architecture: Python handles all data ingestion, LLM calls, signal aggregation, and MiroFish integration; Streamlit serves the dashboard without a separate frontend codebase. This is the correct call for a single-user local tool where MiroFish's Python constraint (3.11-3.12) is non-negotiable. However, one important conflict exists between researchers: the Stack researcher recommends Python-first with Streamlit, while the Architecture researcher assumes TypeScript/Next.js for the dashboard and Monte Carlo engine. **Resolution: Python-first is correct.** The TypeScript architecture is well-structured but creates a polyglot codebase where the "fast Monte Carlo in TypeScript" argument (the main justification) is outweighed by the cost of maintaining two languages and an IPC bridge. NumPy-based Monte Carlo in Python runs in milliseconds — fast enough for this use case.

The two most important risks are cost explosion (MiroFish + Claude API can burn $50-200 on a single busy news day if unthrottled) and treating MiroFish simulation outputs as calibrated probabilities (they are narrative scenarios, not statistical forecasts). Both must be designed in from the start: token budgets and significance thresholds control cost; a separate calibration layer that tracks predicted vs. actual outcomes is required before any confidence percentage can be trusted. Beyond these, Twitter data cascade silent failures and LLM sentiment non-determinism are the operational landmines most likely to silently corrupt predictions.

## Key Findings

### Recommended Stack

Python 3.11-3.12 is a hard constraint from MiroFish. The entire stack builds around it: python-binance for Binance WebSocket, feedparser + GNews for news, aiohttp for Twitter REST calls, anthropic SDK with structured outputs for classification and sentiment, scikit-learn + numpy for lightweight ML, pandas for data manipulation, SQLite as the local database (no server process needed), APScheduler for periodic jobs, and Streamlit + Plotly for the dashboard. The Twitter data cascade runs across four tiers (FxTwitter self-hosted -> twitterapi.io -> X API v2 -> Grok/xAI) with cost escalating at each tier. MiroFish itself requires a separate Qwen-compatible LLM endpoint (recommended: Qwen-Plus via DashScope) and Zep Cloud for agent memory.

**Core technologies:**
- Python 3.11-3.12: runtime — MiroFish hard constraint, all ML libs native
- MiroFish: multi-agent scenario simulation engine — project requirement, OASIS-based
- Streamlit 1.55+: dashboard UI — eliminates frontend codebase, st.fragment for real-time
- python-binance 1.0.35: price feed — WebSocket OHLCV, well-documented
- anthropic SDK 0.84.0: event classification + sentiment — structured outputs (Pydantic)
- feedparser + GNews: news ingestion — free, no API keys, battle-tested
- SQLite: persistence — single-user local, stdlib, no server process
- APScheduler 3.10+: job scheduling — in-process, no Redis/Celery needed
- uv: package manager — MiroFish uses it, 10-100x faster than pip

**Not recommended:** TypeScript as primary language, Next.js/React dashboard, FastAPI, Celery, Redis, PostgreSQL, Neo4j (use GraphRAG without it), PyTorch/TensorFlow for custom code.

### Expected Features

**Must have (table stakes) — v1:**
- Real-time Binance price feed (WebSocket, TRUMP/USDT)
- News RSS ingestion (5-10 curated geopolitical feeds)
- Event classification engine (5 categories, LLM-based, structured output)
- Basic sentiment analysis (Claude API, batched, discrete buckets)
- MiroFish integration (3 scenario trajectories: bull/base/bear)
- Simple Streamlit dashboard (price chart + event feed + scenario overlay)
- Single Twitter/X source (FxTwitter Tier 1 to start)
- Prediction logging (timestamps, parameters, outcomes — from day one)

**Should have (differentiators) — v1.x:**
- Full 4-tier Twitter cascade with health monitoring and tier-source logging
- Wildcard signal tracking (memes/viral content, disabled by default)
- Generated narrative reports (LLM summary of simulation outputs)
- Event-to-price causal chain visualization (explainability layer)
- Scenario comparison timeline (predicted vs. actual as events unfold)
- Configurable alert thresholds

**Defer (v2+):**
- Multi-asset support (BTC/ETH) — validate event-to-price mapping on TRUMP first
- Fundamental/on-chain analysis layer — adds value only after baseline accuracy proven
- Accuracy statistics dashboard — needs 30+ days of logged predictions
- GPT-OS-120B integration — premature optimization
- Telegram/Discord bot — deployment complexity, not core value

No automated trade execution. Ever. The system is analysis-only by design.

### Architecture Approach

The system is a 5-layer pipeline: ingestion adapters (each data source behind a common interface) feed a typed event bus (Python EventEmitter equivalent), which routes to a processing layer (event classifier, sentiment analyzer, signal aggregator), which drives a dual prediction engine (NumPy Monte Carlo for fast 1-24h predictions; MiroFish for deep multi-day scenario analysis), all persisted in SQLite and visualized through a Streamlit dashboard. The event bus is the architectural backbone — it decouples all components so failures are isolated, components are independently testable, and new data sources can be added without touching prediction logic. The Twitter cascade uses an explicit fallback pattern with health checks and per-tier logging; each tier implements a common DataSource interface. MiroFish is accessed as a long-lived Python subprocess (spawned once, reused across requests) with JSON over stdin/stdout IPC.

**Major components:**
1. Data Ingestion Layer — adapters for Binance, Twitter cascade, news RSS, each behind DataSource interface
2. Event Bus — typed publish/subscribe backbone decoupling all layers
3. Processing Layer — event classifier (5 categories), sentiment analyzer (Claude API), signal aggregator (weighted combination)
4. Dual Prediction Engine — NumPy Monte Carlo (fast, short-term) + MiroFish bridge (deep, multi-day)
5. Storage — SQLite for events/prices/predictions; in-memory dict for active state; file system for reports
6. Presentation — Streamlit dashboard with Plotly charts, st.fragment for real-time updates

**Architecture conflict resolved:** The Architecture research file specifies TypeScript/Next.js for the dashboard and suggests implementing Monte Carlo in TypeScript for speed. Stack research correctly identifies this as unnecessary complexity. The resolution: Python-only codebase, NumPy Monte Carlo (millisecond execution time), Streamlit dashboard. The IPC bridge pattern documented in ARCHITECTURE.md is still valid for calling MiroFish from within a Python-first codebase (subprocess calling MiroFish's internal Python processes if needed), but no TypeScript layer is required.

### Critical Pitfalls

1. **MiroFish outputs are narratives, not calibrated probabilities** — Build a separate calibration layer that tracks predicted vs. actual outcomes from day one. Label all displayed confidence as "scenario weight, not calibrated forecast" until you have backtesting data to support actual percentages.

2. **Token costs explode under real-time load** — Set a significance threshold (e.g., minimum impact score) before triggering MiroFish. Use Qwen-Plus for simulation agents, Claude only for final classification and reporting. Cache MiroFish knowledge graphs across related events. Budget $35-165/month baseline, up to $200+ on active geopolitical crisis days.

3. **Twitter cascade fails silently at exactly the wrong time** — Implement per-tier health checks, per-tier data attribution logging, and a "data freshness" monitor that alerts if no tweets arrive in 5+ minutes on a tracked topic. Fail loudly, never return empty results silently.

4. **LLM sentiment scores are non-deterministic** — Pin to specific model versions (e.g., `claude-sonnet-4-20250514`), set temperature=0, cache results per content item, use discrete 5-bucket classification instead of continuous scores.

5. **Binance WebSocket drops silently on Mac** — Track last received price tick timestamp. Halt predictions if stale >30 seconds. Use `caffeinate -i` to prevent macOS sleep. Implement exponential backoff reconnection.

## Implications for Roadmap

Based on combined research, the dependency chain is clear and should drive phase structure. Each phase has a hard dependency on the previous one being stable before proceeding.

### Phase 1: Foundation + Infrastructure

**Rationale:** Every component needs persistence, a config system, and an event bus. Building these first means every subsequent component can be built and tested in isolation. Binance WebSocket is the lowest-risk data source — simple, reliable, well-documented — and validates the full ingestion->bus->storage pipeline before adding complexity.

**Delivers:** Running system with real-time price feed, SQLite schema, typed event bus, project config system, development environment with MiroFish dependencies installed.

**Addresses:** Table stakes — price feed is prerequisite for everything else.

**Avoids:** Anti-pattern of monolithic pipelines (event bus enforces decoupling from the start); Binance WebSocket disconnection (heartbeat monitoring built in from day one).

**Stack:** Python 3.11-3.12 + uv, SQLite, APScheduler, python-binance, pydantic-settings, python-dotenv.

### Phase 2: Event Ingestion Pipeline

**Rationale:** Once the bus and storage exist, add data sources one at a time. Start with news RSS (simplest, free, no auth). Add Twitter Tier 1 (FxTwitter self-hosted). This phase ends when raw events are flowing through the bus and being persisted.

**Delivers:** News RSS ingestion (5-10 feeds), FxTwitter Tier 1 integration, event deduplication, per-source health monitoring, canonical event format (all sources normalize to the same schema).

**Addresses:** Table stakes — news + social ingestion are prerequisites for event classification.

**Avoids:** Twitter cascade silent failures (health checks and data freshness monitoring designed in); bot amplification (basic account filtering in ingestion layer, not post-processing).

**Stack:** feedparser, GNews, aiohttp, FxTwitter (self-hosted Cloudflare Worker).

### Phase 3: Event Processing (Classification + Sentiment)

**Rationale:** Raw text is useless without classification. This is the highest-value phase — the geopolitical intelligence layer that differentiates GeoPredict from generic sentiment tools.

**Delivers:** LLM-based event classifier (5 abstract categories: Military/Conflict, Policy/Regulation, Political Drama, Economic Signals, Wildcard), sentiment analyzer (batched Claude API calls, discrete 5-bucket output, cached per content item, temperature=0, pinned model version), signal aggregator (weighted combination of classified events + sentiment + price context).

**Addresses:** Core differentiator — geopolitical event classification is the novel capability.

**Avoids:** LLM non-determinism (discrete buckets, caching, pinned versions); event category overfitting to Iran-US-Israel (abstract categories, not actor-specific); real-time LLM calls in hot path (batching with 30-second time windows).

**Stack:** anthropic SDK 0.84.0, Pydantic structured outputs, scikit-learn for feature engineering.

**Needs research during planning:** Prompt engineering for geopolitical classification is non-trivial. The 5-category taxonomy and impact scoring schema need to be validated against real geopolitical events before building.

### Phase 4: Prediction Engine

**Rationale:** Predictions require classified, sentiment-scored signals as input. Build the fast NumPy Monte Carlo first — it produces immediately useful 1-24h predictions without MiroFish complexity. Add MiroFish bridge second for deep multi-day scenarios.

**Delivers:** NumPy Monte Carlo scenario generator (3 probability-weighted price paths: bull/base/bear, per event type temporal profile), prediction logging (all predictions stored with parameters and timestamps before events resolve), MiroFish bridge (long-lived subprocess, JSON IPC, significance threshold gate), significance threshold system (only trigger MiroFish for high-impact events).

**Addresses:** Core table stakes — price prediction with confidence intervals.

**Avoids:** Treating MiroFish outputs as calibrated probabilities (calibration logging from day one); token cost explosion (significance threshold, cached knowledge graphs, Qwen-Plus for simulation agents); wrong temporal profiles per event type (negative/shock events = minutes horizon; positive/diplomatic = hours-days horizon; viral/meme = engagement velocity timing).

**Stack:** numpy, scikit-learn, MiroFish (Qwen-Plus via DashScope, Zep Cloud).

**Needs research during planning:** MiroFish local setup complexity, Zep Cloud quota limits vs. self-hosted Zep trade-offs, actual MiroFish API/IPC interface (not well-documented externally).

### Phase 5: Dashboard + Reporting

**Rationale:** Dashboard is the thinnest layer — it visualizes data that already exists. Building it last means all data is flowing and the visualizations accurately represent real predictions rather than mock data.

**Delivers:** Streamlit dashboard (real-time price chart, event feed, 3-scenario trajectory overlay using Plotly, data source health status), prediction logging display, generated text reports (LLM narrative summary of simulation outputs, stored as Markdown).

**Addresses:** Table stakes — real-time dashboard visualization.

**Avoids:** Presenting uncalibrated confidence as authoritative (label all scenario weights explicitly as uncalibrated until calibration data exists); dashboard depending on incomplete upstream data (build last).

**Stack:** Streamlit 1.55+, Plotly 5.x, st.fragment for real-time updates.

### Phase 6: Cascade Reliability + Differentiators (v1.x)

**Rationale:** Add the full Twitter cascade, wildcard signals, explainability features, and scenario comparison once the core prediction loop is validated. These features improve accuracy and user experience but are not required to validate the core hypothesis.

**Delivers:** Full 4-tier Twitter cascade (FxTwitter -> twitterapi.io -> X API v2 -> Grok), wildcard signal tracking (disabled by default, virality threshold gate, daily budget cap), event-to-price causal chain visualization, scenario comparison timeline (predicted vs. actual overlay), configurable alerts.

**Deferred from v1:** These features are p2 — they enhance a proven core, not substitute for one.

**Avoids:** Wildcard signals becoming noise amplifiers (starts disabled, needs virality threshold); cascade tiers mixing data formats (canonical normalization enforced at ingestion boundary).

### Phase Ordering Rationale

- Event bus first because without it, all components couple to each other directly — technical debt that cannot be refactored cheaply later.
- Price feed before Twitter because Binance is the most reliable signal and validates the pipeline with zero auth/scraping complexity.
- Processing before Prediction because predictions fed by unclassified raw text are meaningless. Classification is where the intellectual value lives.
- Monte Carlo before MiroFish because NumPy Monte Carlo takes hours to implement; MiroFish integration takes days-to-weeks and has significant environment setup overhead. Don't block the core product on MiroFish.
- Dashboard last because it is purely additive — it shows what already exists. Building it with real data means no mocking.
- v1.x features (full cascade, wildcards) after core loop validated because the core hypothesis (geopolitical events predict meme coin prices) needs to be proven before investing in cascade reliability and signal expansion.

### Research Flags

Phases needing deeper research during planning:
- **Phase 3 (Classification):** Prompt engineering for geopolitical classification requires validation against real event corpora. The 5-category taxonomy's boundaries are unclear — needs examples of edge cases before implementation.
- **Phase 4 (MiroFish integration):** MiroFish's actual IPC interface, internal APIs, GraphRAG internals, and Zep Cloud alternatives are not well-documented externally. Hands-on exploration required before committing to integration patterns.
- **Phase 4 (Temporal profiles):** Empirical lag between event detection and peak price impact per event category requires research into academic literature or historical TRUMP price data analysis.

Phases with standard patterns (can skip research-phase):
- **Phase 1 (Foundation):** SQLite + Python event bus patterns are well-established. No novel engineering.
- **Phase 2 (Ingestion):** RSS parsers, WebSocket clients, Binance API — all well-documented with working examples.
- **Phase 5 (Dashboard):** Streamlit + Plotly patterns are standard. Official docs are sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core libraries verified against PyPI (actual versions confirmed). MiroFish is MEDIUM because the repo docs haven't been locally verified against a running instance. |
| Features | MEDIUM | Individual components well-understood. The novel combination (geopolitical classification + meme coin simulation) has no direct precedent to validate against. Competitor analysis is solid. |
| Architecture | MEDIUM | Event bus patterns and cascade fallback are established. MiroFish integration specifics (actual IPC interface, GraphRAG internals) are inferred from docs, not tested. |
| Pitfalls | HIGH | Pitfalls are grounded in published research (LLM variability in finance, crypto sentiment analysis studies) and well-understood operational failure modes (WebSocket drops, cascade silent failures). |

**Overall confidence:** MEDIUM

### Gaps to Address

- **MiroFish local setup:** STACK.md and ARCHITECTURE.md both treat MiroFish setup as straightforward, but it is a complex Python/Vue/OASIS stack with multiple external dependencies (Zep Cloud, Qwen-Plus endpoint, optional Neo4j). Hands-on setup required before Phase 4 planning can be finalized.
- **Calibration strategy:** PITFALLS.md identifies the need for a calibration layer but doesn't specify the mechanism. Whether to use Brier scores, prediction market data as reference, or human judgment for initial probability weights needs a decision before Phase 4.
- **Event taxonomy edge cases:** The 5-category classification system needs 20-30 representative examples per category to define boundaries before prompt engineering begins. This is a pre-Phase 3 research task.
- **Zep Cloud vs. self-hosted Zep:** Free tier quota limits are mentioned but not quantified. Evaluate self-hosted Zep against MiroFish's memory requirements before committing to cloud dependency.
- **Streamlit real-time limits:** st.fragment(run_every=N) is documented as the real-time update mechanism, but its practical polling performance with Plotly candlestick charts at 30-second intervals needs validation.

## Sources

### Primary (HIGH confidence)
- [python-binance PyPI v1.0.35](https://pypi.org/project/python-binance/) — Binance WebSocket and REST integration
- [anthropic PyPI v0.84.0](https://pypi.org/project/anthropic/) — Claude API, structured outputs
- [Streamlit PyPI v1.55.0](https://pypi.org/project/streamlit/) — Dashboard, st.fragment real-time
- [Streamlit st.fragment docs](https://docs.streamlit.io/develop/api-reference/execution-flow/st.fragment) — Real-time update mechanism
- [feedparser PyPI v6.0.12](https://pypi.org/project/feedparser/) — RSS ingestion
- [FxTwitter/FixTweet GitHub](https://github.com/FixTweet/FxTwitter) — Self-hosted Twitter extraction
- [FxTwitter Deploy Docs](https://docs.fxtwitter.com/en/latest/deploy/index.html) — Cloudflare Worker deployment
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — Pydantic schema enforcement
- [Path Dependent Monte Carlo for Crypto (arxiv)](https://arxiv.org/html/2405.12988v1) — Scenario simulation methodology
- [LLM Sentiment Variability in Finance (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12375657/) — Non-determinism research

### Secondary (MEDIUM confidence)
- [MiroFish GitHub](https://github.com/666ghj/MiroFish) — Core prediction engine (not locally verified)
- [MiroFish DeepWiki](https://deepwiki.com/666ghj/MiroFish) — Architecture breakdown
- [MiroFish-Offline Fork](https://github.com/nikmcfly/MiroFish-Offline) — Neo4j + Ollama local deployment variant
- [GNews PyPI v0.4.3](https://pypi.org/project/gnews/) — Google News RSS wrapper
- [twitterapi.io pricing](https://twitterapi.io/blog/twitter-api-pricing-2025) — Tier 2 cost model
- [Santiment API](https://api.santiment.net/) — Competitor feature benchmark
- [LunarCrush API](https://lunarcrush.com/about/api) — Competitor feature benchmark
- [Twitter Sentiment Predictive Power (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S104244312030072X) — Temporal lag research
- [Tweet Sentiment for Crypto (MDPI)](https://www.mdpi.com/2227-9091/11/9/159) — Bot prevalence analysis

### Tertiary (LOW confidence, needs validation)
- [WAR Memecoin](https://bingx.com/en/learn/article/what-is-war-crypto-politifi-memecoin-on-solana-how-to-buy) — Geopolitical sentiment index comparison
- [Geopolitical Prediction Market Risks (Virginia Tech)](https://news.vt.edu/articles/2026/03/Prediction-markets-geopolitics-economist-betting-expert.html) — Fundamental prediction market limitations

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
