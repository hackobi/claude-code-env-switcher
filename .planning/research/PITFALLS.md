# Domain Pitfalls

**Domain:** Geopolitical event-driven crypto price prediction (meme coin focus)
**Researched:** 2026-03-16

## Critical Pitfalls

Mistakes that cause rewrites, wasted money, or fundamentally broken predictions.

### Pitfall 1: Treating MiroFish Simulations as Probability Estimates

**What goes wrong:** MiroFish generates plausible narrative scenarios through multi-agent simulation. Teams treat simulation outputs as calibrated probability distributions (e.g., "65% chance price goes to $12") when they are actually emergent narrative outcomes from LLM-driven agents. The framework has published zero benchmarks comparing predictions against actual outcomes.

**Why it happens:** MiroFish's output format looks like quantified predictions. The swarm intelligence framing suggests rigor. But it is a social simulation engine (built on CAMEL-AI's OASIS), not a statistical forecasting tool. It produces "what might happen" stories, not "how likely is X" estimates.

**Consequences:** All downstream confidence levels, scenario weightings, and trading signals are built on uncalibrated foundations. Users trust numbers that have no demonstrated predictive validity.

**Prevention:**
- Treat MiroFish outputs as scenario generation only, never as calibrated probabilities
- Build a separate calibration layer that tracks predicted vs. actual outcomes over time
- Assign probability weights through a separate mechanism (historical base rates, prediction market data, or explicit human judgment) rather than from MiroFish's simulation output
- Start logging predictions from day one so you can measure calibration before trusting any signal

**Detection:** If your system outputs confidence percentages but you cannot point to backtesting data showing those percentages are calibrated, you have this problem.

**Phase relevance:** Must be addressed in architecture design (Phase 1). Cannot be bolted on later without reworking how scenario probabilities flow through the system.

---

### Pitfall 2: LLM Sentiment Scores Are Non-Deterministic and Uncalibrated

**What goes wrong:** Claude API (or any LLM) produces different sentiment scores for identical input text across calls. Prompt phrasing, decoding parameters, and model updates all change outputs. Teams build systems assuming sentiment analysis returns stable, reproducible numbers.

**Why it happens:** LLMs are probabilistic next-token predictors. Sentiment analysis is an emergent capability, not a calibrated measurement instrument. Research shows model variability is "particularly concerning in high-risk decision-making applications" where "unstable predictions can lead to inaccurate market forecasts."

**Consequences:** The same tweet analyzed at two different times produces different sentiment scores. Aggregated sentiment signals drift unpredictably. Threshold-based triggers fire inconsistently. Backtesting becomes meaningless if the model has been updated between the backtest period and live use.

**Prevention:**
- Set temperature to 0 for all sentiment calls (reduces but does not eliminate variance)
- Cache sentiment results per content item -- never re-analyze the same text
- Use structured output (e.g., force classification into 5 discrete buckets rather than continuous scores)
- Build variance-aware aggregation: run 3 calls per critical text and use majority vote or median
- Pin to specific model versions (e.g., `claude-sonnet-4-20250514`, not `claude-sonnet-4-latest`)
- Track sentiment distribution statistics over time to detect model drift

**Detection:** Run the same 50 texts through your sentiment pipeline twice. If scores differ by more than 10% on average, your system is not deterministic enough for production signals.

**Phase relevance:** Address in sentiment analysis implementation. Must be designed in from the start, not patched onto an existing pipeline.

---

### Pitfall 3: Twitter/X Data Cascade Fails Silently

**What goes wrong:** The 4-tier cascade (FxTwitter -> twitterapi.io -> X API v2 -> Grok) looks robust on paper but creates a reliability nightmare. Each tier has different failure modes, data formats, rate limits, and coverage gaps. Silent failures at Tier 1 mean the system thinks "no tweets exist" when really FxTwitter is down or rate-limited.

**Why it happens:** FxTwitter scrapes Twitter's guest API, which Twitter regularly breaks or rate-limits. Self-hosted FxTwitter depends on guest token rotation. twitterapi.io is a third-party proxy with its own reliability. Each tier returns data in different formats with different fields available. The cascade logic is easy to write for the happy path but brutal for edge cases.

**Consequences:** Missing data during critical geopolitical events (exactly when you need it most, because everyone is tweeting). Incomplete sentiment signals that look like "calm market" when actually it is "data source down." Mixing data from different tiers produces inconsistent analysis because each tier provides different metadata.

**Prevention:**
- Implement explicit health checks for each tier with status dashboards
- Log which tier served each data point -- this is essential for debugging
- Build a "data freshness" monitor: if no tweets arrive for 5+ minutes on a topic you are tracking, alert immediately
- Normalize all tier outputs to a single canonical format at ingestion time, not downstream
- Design the cascade so failures are loud: if Tier 1 fails, log it, increment a counter, and fall through -- never silently return empty results
- Test the cascade monthly by deliberately breaking each tier

**Detection:** If you cannot answer "what percentage of our data came from each tier in the last 24 hours?" you have this problem.

**Phase relevance:** Must be addressed during data ingestion implementation. The cascade architecture needs monitoring from day one.

---

### Pitfall 4: Confusing Correlation Lag with Real-Time Signal

**What goes wrong:** Research shows that positive tweet sentiment has a "delayed yet lasting influence" on crypto prices, while negative sentiment causes "immediate volatility spikes." Teams build systems assuming uniform lag between signal and price movement, but different signal types have fundamentally different temporal dynamics.

**Why it happens:** It is natural to assume "event happens -> price moves." In reality: negative geopolitical events (military strikes, sanctions) move prices within minutes. Positive developments (ceasefire negotiations, policy changes) take hours to days to fully price in. Meme/viral content has an unpredictable lag that depends on how far it spreads. Building one prediction timeframe for all event types produces a system that is too slow for some events and too fast for others.

**Consequences:** Short-term (1-24 hour) predictions treat all events identically and miss the timing. The system either reacts too late to negative shocks or too early to positive developments, generating false signals in both directions.

**Prevention:**
- Classify events by temporal impact profile, not just category
- Negative/shock events: weight toward immediate price impact (minutes to hours)
- Positive/diplomatic events: weight toward delayed impact (hours to days)
- Viral/meme events: use engagement velocity (rate of spread) as a timing signal, not just content
- Build separate prediction windows per event type rather than one unified timeframe
- Track historical lag between event detection and peak price impact for each event category

**Detection:** If your system uses the same prediction window for "Iran launches missiles" and "trade deal negotiations resume," you have this problem.

**Phase relevance:** Address in scenario simulation engine design. Requires the event classification engine to output temporal profiles.

---

### Pitfall 5: MiroFish Token Costs Explode Under Real-Time Load

**What goes wrong:** MiroFish runs multi-agent simulations using LLM API calls. The recommended starting point is "<40 simulation rounds." Running this for every geopolitical event in real-time, with multiple scenarios per event, burns through API credits at an alarming rate. A single busy news day could cost $50-200+ in LLM API calls for MiroFish alone.

**Why it happens:** MiroFish uses GraphRAG for knowledge graph construction, multi-agent dialogue simulation, and report generation -- each step involves multiple LLM calls. The system was designed for offline analysis of individual questions, not continuous real-time prediction across many events. Adding Claude API sentiment analysis on top of MiroFish's own LLM usage doubles the cost surface.

**Consequences:** Either the system becomes too expensive to run continuously, or you reduce simulation quality to cut costs (fewer rounds, smaller agent populations), which defeats the purpose.

**Prevention:**
- Budget API costs per day and per event before building. Set hard limits.
- Use MiroFish selectively: only for significant events that cross a significance threshold, not for every tweet or minor headline
- Cache and reuse MiroFish knowledge graphs across related events (don't rebuild from scratch for each event in the same geopolitical thread)
- Use cheaper models (Qwen-Plus via DashScope as MiroFish recommends) for simulation agents, reserve Claude for final analysis only
- Implement event deduplication: cluster related events and run one simulation per cluster, not per event
- Track cost per prediction and cost per useful signal to measure ROI

**Detection:** If you don't have a cost projection for "busy geopolitical day" vs. "quiet day," you will be surprised. Calculate before building.

**Phase relevance:** Must be addressed in architecture design. Token budgeting is a first-class architectural concern, not an optimization to do later.

## Moderate Pitfalls

### Pitfall 6: Bot and Manipulation Amplification

**What goes wrong:** Research shows approximately 14% of crypto-related tweets come from bot accounts. For meme coins like TRUMP, this percentage is likely higher. Your sentiment pipeline ingests coordinated bot campaigns as genuine market sentiment, amplifying manufactured narratives.

**Why it happens:** Bot detection is hard. Coordinated campaigns specifically target meme coin communities. High engagement (retweets, likes) correlates negatively with actual price movements -- the most-engaged content is often the most manipulated.

**Prevention:**
- Filter accounts by age, follower ratio, and posting frequency before ingesting
- Weight sentiment by account credibility score, not volume
- Track sudden spikes in tweet volume on a topic -- natural interest grows gradually, bot campaigns spike suddenly
- Use engagement velocity patterns (identical tweets appearing within seconds across accounts) as a manipulation signal
- Consider the research finding that "high social volume often correlates with local tops or bottoms" -- treat volume spikes as contrarian indicators, not confirmation

**Detection:** If your system cannot distinguish between 1000 organic tweets and 1000 bot tweets, it will be manipulated.

**Phase relevance:** Address in data ingestion and sentiment analysis. Build bot detection into the Twitter data pipeline, not as a post-processing step.

---

### Pitfall 7: Overfitting to the Iran-US-Israel Conflict Pattern

**What goes wrong:** The system is designed around the current Iran-US-Israel geopolitical dynamic. Every component -- event classification, scenario templates, signal weighting -- gets tuned to this specific conflict. When the geopolitical landscape shifts (new conflict, different actors, de-escalation), the system's predictions degrade because it has learned one pattern deeply rather than building generalizable geopolitical reasoning.

**Why it happens:** The TRUMP meme coin's direct correlation with Trump-related political events makes it tempting to hardcode specific actors, relationships, and causal chains. "Trump threatens Iran -> TRUMP price spikes" becomes an implicit assumption baked into the system.

**Prevention:**
- Event classification should use abstract categories (Military Escalation, Diplomatic Progress, Sanctions Action) rather than actor-specific ones (Iran Attack, Israel Response)
- Scenario templates should be parameterized by conflict type, not hardcoded to specific geopolitical actors
- Build the "asset-agnostic architecture" from day one, not as a refactor
- Periodically test with historical data from different geopolitical events (Russia-Ukraine, US-China trade war) to check generalizability
- Separate "geopolitical event understanding" from "TRUMP-specific price impact" into distinct components

**Detection:** Count the number of times "Iran," "Israel," or specific actor names appear in your event classification code. If they appear in logic (not just training data), you are overfitting.

**Phase relevance:** Address in event classification engine design. Architecture should enforce actor-agnostic abstractions.

---

### Pitfall 8: Survivorship Bias in Prediction Evaluation

**What goes wrong:** Teams evaluate their prediction system by remembering the times it was right and explaining away the times it was wrong. "We predicted the price spike from the Iran strike" gets celebrated. "We predicted a spike from those sanctions that didn't move price" gets attributed to "unusual market conditions."

**Why it happens:** Crypto price predictions are easy to make and hard to evaluate rigorously. With multiple scenarios per event, it is always possible to claim "our second-most-likely scenario was close." With wide prediction ranges, almost any outcome falls within "our forecast."

**Prevention:**
- Log every prediction with its exact parameters, timestamp, confidence, and predicted price range before the event resolves
- Use Brier scores or log-loss to evaluate prediction calibration numerically, not narratively
- Track hit rates across all predictions, not just notable ones
- Define success criteria before each prediction: what price movement, in what timeframe, constitutes a "correct" prediction?
- Review misses as rigorously as hits -- every wrong prediction should produce a written post-mortem

**Detection:** If your team can describe recent successes but not recent failures with equal specificity, you have survivorship bias.

**Phase relevance:** Build evaluation infrastructure in the same phase as prediction output. Not optional. Not v2.

---

### Pitfall 9: Binance WebSocket Connection Management on Local Mac

**What goes wrong:** Running on a local Mac means dealing with sleep/wake cycles, Wi-Fi reconnections, ISP hiccups, and macOS power management. WebSocket connections to Binance drop silently. The system continues operating on stale price data without realizing the feed is dead.

**Why it happens:** Server-grade infrastructure handles persistent connections differently than a laptop. macOS aggressively sleeps network interfaces. Binance WebSocket streams require keepalive pings every 3 minutes or they disconnect. Most WebSocket client libraries do not handle reconnection well by default.

**Prevention:**
- Implement explicit heartbeat monitoring: if no price update arrives in 10 seconds, the connection is likely dead
- Use automatic reconnection with exponential backoff
- Track the timestamp of the last received price tick. If stale by more than 30 seconds, halt all predictions and alert.
- Consider using Binance REST API as a fallback health check when WebSocket seems silent
- Prevent macOS from sleeping the process: `caffeinate -i` or configure Energy Saver settings
- Log all disconnection/reconnection events for debugging

**Detection:** Let your system run for 24 hours on a Mac. Check the price data log for gaps. There will be gaps.

**Phase relevance:** Address in data ingestion phase. Must be built into the Binance integration from the start.

## Minor Pitfalls

### Pitfall 10: Wildcard Signal Category Becomes a Noise Amplifier

**What goes wrong:** The "Wildcard" category (memes, schizo posts, viral narratives) is designed to capture signals that don't fit standard categories. Without careful tuning, it becomes a catch-all that amplifies noise. Every random viral tweet triggers a scenario simulation, burning MiroFish tokens on irrelevant content.

**Prevention:**
- Require wildcard signals to cross a virality threshold (minimum engagement velocity) before triggering analysis
- Start with wildcard signals disabled, enable only after the core system is validated
- Set a daily budget cap for wildcard-triggered simulations
- Weight wildcard signals at 0.1x default until you have evidence they add predictive value

**Phase relevance:** Implement wildcard signals in a later phase, after core event classification is proven.

---

### Pitfall 11: Knowledge Graph Staleness in MiroFish

**What goes wrong:** MiroFish builds knowledge graphs via GraphRAG to represent the world state. In a rapidly evolving geopolitical situation, yesterday's knowledge graph contains outdated relationships and assumptions. Running simulations on a stale graph produces scenarios based on old information.

**Prevention:**
- Implement incremental knowledge graph updates rather than full rebuilds
- Tag graph nodes with timestamps and decay old information
- Force graph refresh when a classified event contradicts existing graph state
- Track knowledge graph version alongside each prediction for debugging

**Phase relevance:** Address during MiroFish integration. Requires understanding MiroFish's GraphRAG internals.

---

### Pitfall 12: Zep Cloud Dependency for MiroFish Memory

**What goes wrong:** MiroFish depends on Zep Cloud for agent memory management. Zep Cloud's free tier has quotas. If you hit the quota during a critical prediction run, MiroFish simulations fail mid-execution.

**Prevention:**
- Understand Zep Cloud free tier limits before building
- Investigate self-hosted Zep as an alternative (Zep is open-source)
- Build a fallback for when Zep is unavailable (even if it means degraded simulation quality)
- Monitor Zep usage and set alerts at 80% quota

**Phase relevance:** Address during MiroFish setup. Evaluate Zep alternatives before committing.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| MiroFish integration | Token costs, Zep dependency, uncalibrated outputs | Budget tokens, self-host Zep, build calibration layer |
| Twitter data cascade | Silent failures, bot amplification, format inconsistency | Health checks, bot filtering, canonical format normalization |
| Sentiment analysis | Non-deterministic scores, LLM hallucination on numbers | Pin model versions, cache results, use discrete buckets |
| Event classification | Overfitting to current conflict, wrong temporal profiles | Abstract categories, parameterized templates |
| Scenario simulation | Treating narratives as probabilities, cost explosion | Separate calibration layer, event significance threshold |
| Price data ingestion | WebSocket drops on local Mac, stale data | Heartbeat monitoring, caffeinate, REST fallback |
| Prediction evaluation | Survivorship bias, unfalsifiable wide ranges | Brier scores, pre-registered predictions, post-mortems |
| Wildcard signals | Noise amplification, token waste | Virality threshold, disabled by default, daily budget cap |
| Dashboard/reporting | Presenting uncalibrated confidence as authoritative | Label all probabilities as "scenario weight, not calibrated forecast" |

## Sources

- [MiroFish GitHub](https://github.com/666ghj/MiroFish) - Framework architecture, dependencies, token consumption guidance
- [MiroFish-Offline Fork](https://github.com/nikmcfly/MiroFish-Offline) - Offline deployment considerations
- [LLM Sentiment Variability in Financial Applications (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12375657/) - Model uncertainty and variability research
- [LLM Hallucination in Finance (arxiv)](https://arxiv.org/html/2311.15548) - Financial hallucination deficiency study
- [Crypto Twitter Herd Mentality Analysis](https://blockchain.news/flashnews/crypto-twitter-herd-mentality-is-often-wrong-according-to-kookcapitalllc-2025-sentiment-trading-implications) - Contrarian sentiment signals
- [Twitter Sentiment Predictive Power (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S104244312030072X) - Temporal lag in sentiment-price correlation
- [Tweet Sentiment for Crypto Price Prediction (MDPI)](https://www.mdpi.com/2227-9091/11/9/159) - Bot prevalence and engagement patterns
- [Geopolitical Prediction Markets Risks (Virginia Tech)](https://news.vt.edu/articles/2026/03/Prediction-markets-geopolitics-economist-betting-expert.html) - Prediction market limitations
- [Real-Time Crypto Data Challenges (CoinAPI)](https://www.coinapi.io/blog/why-real-time-crypto-data-is-harder-than-it-looks) - Data pipeline reliability
- [TRUMP Price Prediction Analysis (FXOpen)](https://fxopen.com/blog/en/analytical-trump-coin-price-predictions-from-2026-to-2030/) - TRUMP token volatility characteristics
- [FxTwitter Architecture Docs](https://docs.fxtwitter.com/en/latest/deploy/architecture.html) - Guest token and rate limit behavior
- [Bitcoin Price Forecast Failures 2025 (CoinDesk)](https://www.coindesk.com/markets/2025/12/30/in-2025-bitcoin-showed-how-spectacularly-wrong-price-forecasts-can-be) - Prediction accuracy track records
