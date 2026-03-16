# Architecture Research

**Domain:** Real-time geopolitical event-driven crypto price prediction
**Researched:** 2026-03-16
**Confidence:** MEDIUM

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA INGESTION LAYER                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Twitter/X │  │ News RSS  │  │  Binance   │  │ On-Chain  │       │
│  │ 4-Tier    │  │ Feeds     │  │ WebSocket  │  │ Metrics   │       │
│  │ Cascade   │  │           │  │            │  │           │       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
│        │              │              │              │               │
├────────┴──────────────┴──────────────┴──────────────┴───────────────┤
│                      EVENT BUS (EventEmitter)                       │
├─────────────────────────────────────────────────────────────────────┤
│                      PROCESSING LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   Event     │  │  Sentiment  │  │  Signal     │                │
│  │  Classifier │  │  Analyzer   │  │  Aggregator │                │
│  │  (5 types)  │  │  (Claude)   │  │             │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │               │               │                          │
├─────────┴───────────────┴───────────────┴──────────────────────────┤
│                      PREDICTION LAYER                               │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │   MiroFish Bridge    │  │  Scenario Simulation  │                │
│  │   (Python subprocess)│  │  Engine (Monte Carlo) │                │
│  └──────────┬───────────┘  └──────────┬───────────┘                │
│             │                         │                             │
├─────────────┴─────────────────────────┴────────────────────────────┤
│                      STORAGE LAYER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                         │
│  │ SQLite   │  │ In-Memory│  │ File     │                         │
│  │ (events, │  │ (active  │  │ (reports,│                         │
│  │  prices) │  │  state)  │  │  exports)│                         │
│  └──────────┘  └──────────┘  └──────────┘                         │
├─────────────────────────────────────────────────────────────────────┤
│                      PRESENTATION LAYER                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │  Dashboard (Next.js) │  │  Report Generator    │                │
│  │  WebSocket + SSE     │  │  (Markdown/PDF)      │                │
│  └──────────────────────┘  └──────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Twitter Cascade** | Fetch tweets from 4 tiers (FxTwitter -> twitterapi.io -> X API v2 -> Grok/xAI) with fallback logic | TypeScript adapter per tier, shared interface, circuit breaker pattern |
| **News Ingester** | Poll RSS feeds and news APIs for geopolitical events | RSS parser (feedparser/rss-parser), configurable polling interval |
| **Price Feed** | Maintain real-time OHLCV data via Binance WebSocket | ws library, reconnection logic, local candle aggregation |
| **On-Chain Metrics** | Pull volume, liquidity, holder data | REST polling against public APIs (DexScreener, etc.) |
| **Event Bus** | Decouple producers from consumers, route typed events | Node.js EventEmitter or a lightweight typed pub/sub |
| **Event Classifier** | Categorize raw data into 5 event types (Military, Policy, Political, Economic, Wildcard) | LLM-assisted classification with fallback keyword matching |
| **Sentiment Analyzer** | Score text data for bullish/bearish/neutral sentiment | Claude API calls with structured output, batch processing |
| **Signal Aggregator** | Combine classified events + sentiment + price data into weighted signals | Time-windowed aggregation, configurable weights per event type |
| **MiroFish Bridge** | Interface between TypeScript app and MiroFish's Python simulation engine | Child process spawning, JSON over stdin/stdout IPC |
| **Scenario Engine** | Generate N probability-weighted price paths per event scenario | Monte Carlo simulation with event-conditioned drift/volatility |
| **Dashboard** | Real-time visualization of scenarios, events, signals | Next.js + Recharts/Lightweight Charts, WebSocket for live updates |
| **Report Generator** | Produce human-readable analysis documents | Markdown templating + LLM summarization |

## Recommended Project Structure

```
geopredict/
├── src/
│   ├── ingestion/              # Data source adapters
│   │   ├── twitter/
│   │   │   ├── cascade.ts      # 4-tier fallback orchestrator
│   │   │   ├── fxtwitter.ts    # Tier 1: FxTwitter adapter
│   │   │   ├── twitterapi.ts   # Tier 2: twitterapi.io adapter
│   │   │   ├── xapi.ts         # Tier 3: X API v2 adapter
│   │   │   └── grok.ts         # Tier 4: Grok/xAI fallback
│   │   ├── news/
│   │   │   └── rss.ts          # RSS feed poller
│   │   ├── price/
│   │   │   └── binance.ts      # Binance WebSocket client
│   │   └── onchain/
│   │       └── metrics.ts      # On-chain data fetcher
│   ├── processing/             # Event analysis pipeline
│   │   ├── classifier.ts       # Event type classification
│   │   ├── sentiment.ts        # Sentiment analysis (Claude API)
│   │   └── aggregator.ts       # Signal combination + weighting
│   ├── prediction/             # Scenario generation
│   │   ├── mirofish-bridge.ts  # Python subprocess IPC
│   │   ├── scenario-engine.ts  # Monte Carlo path generator
│   │   └── types.ts            # Prediction data types
│   ├── storage/                # Persistence
│   │   ├── db.ts               # SQLite connection + migrations
│   │   ├── events.ts           # Event storage queries
│   │   ├── prices.ts           # Price data queries
│   │   └── predictions.ts      # Prediction result queries
│   ├── bus/                    # Internal event system
│   │   └── event-bus.ts        # Typed EventEmitter wrapper
│   ├── config/                 # Asset + source configuration
│   │   ├── assets.ts           # Asset definitions (TRUMP, BTC, etc.)
│   │   ├── sources.ts          # Data source config
│   │   └── weights.ts          # Event type weight config
│   └── server/                 # API + WebSocket server
│       ├── api.ts              # REST endpoints
│       └── ws.ts               # WebSocket handler
├── dashboard/                  # Next.js frontend
│   ├── app/
│   │   ├── page.tsx            # Main dashboard
│   │   ├── scenarios/          # Scenario visualization
│   │   └── events/             # Event feed view
│   └── components/
│       ├── PriceChart.tsx       # Multi-scenario price chart
│       ├── EventFeed.tsx        # Real-time event stream
│       ├── SignalGauge.tsx      # Aggregated signal display
│       └── ScenarioCard.tsx     # Individual scenario detail
├── mirofish/                   # MiroFish integration
│   ├── setup.sh                # MiroFish dependency installer
│   ├── bridge.py               # Python-side IPC handler
│   └── config/                 # MiroFish configuration
├── reports/                    # Generated report output
├── scripts/                    # Utility scripts
│   ├── seed-data.ts            # Load test data
│   └── backtest.ts             # Historical replay
└── tests/
```

### Structure Rationale

- **src/ingestion/**: Each data source is its own adapter behind a common interface. The Twitter cascade is complex enough to warrant its own subfolder. This isolation lets you add/remove sources without touching processing logic.
- **src/processing/**: Stateless transformation functions. Classifier, sentiment, and aggregator are independent — they read from the event bus and write back to it. This makes them independently testable and swappable.
- **src/prediction/**: The heaviest intellectual component. MiroFish bridge isolates the Python interop complexity. Scenario engine handles the Monte Carlo math in TypeScript for the cases where full MiroFish simulation is overkill (short-term, single-variable predictions).
- **mirofish/**: Kept separate because it's a Python ecosystem (Flask, OASIS, Neo4j). The bridge pattern keeps the TypeScript app clean while leveraging MiroFish's agent simulation capabilities.
- **dashboard/**: Standard Next.js app, separate from the backend. Communicates via WebSocket for real-time data and REST for historical queries.

## Architectural Patterns

### Pattern 1: Ingestion Adapter with Cascade Fallback

**What:** Each data source implements a common `DataSource` interface. The Twitter cascade wraps 4 adapters with automatic fallback — if Tier 1 fails or is rate-limited, it tries Tier 2, and so on.

**When to use:** Any data source with reliability/cost concerns.

**Trade-offs:** More initial code, but eliminates single points of failure for critical data. The cascade must track which tier succeeded to inform cost monitoring.

```typescript
interface DataSource<T> {
  name: string;
  fetch(query: SourceQuery): Promise<T[]>;
  healthCheck(): Promise<boolean>;
}

interface CascadeTier<T> extends DataSource<T> {
  tier: number;
  costPer1k: number;
  rateLimit: RateLimitConfig;
}

class TwitterCascade implements DataSource<Tweet> {
  private tiers: CascadeTier<Tweet>[];

  async fetch(query: SourceQuery): Promise<Tweet[]> {
    for (const tier of this.tiers) {
      try {
        if (await tier.healthCheck()) {
          const results = await tier.fetch(query);
          this.metrics.recordTierUsage(tier.tier);
          return results;
        }
      } catch (err) {
        this.metrics.recordTierFailure(tier.tier, err);
        continue;
      }
    }
    throw new AllTiersExhaustedError(query);
  }
}
```

### Pattern 2: Typed Event Bus

**What:** A central EventEmitter with typed events connecting ingestion, processing, and prediction layers. Each component subscribes to event types it cares about and emits its outputs as new events.

**When to use:** Always — this is the backbone of the system. Without it, components become tightly coupled.

**Trade-offs:** Debugging event flows requires good logging. Events can create implicit dependencies that are harder to trace than direct function calls. Keep the event type catalog small and well-documented.

```typescript
type EventMap = {
  'raw:tweet': { source: string; data: Tweet; timestamp: number };
  'raw:news': { source: string; data: NewsItem; timestamp: number };
  'raw:price': { pair: string; data: OHLCV; timestamp: number };
  'classified:event': { type: EventCategory; data: ClassifiedEvent };
  'scored:sentiment': { eventId: string; score: SentimentScore };
  'signal:aggregated': { assetId: string; signal: AggregatedSignal };
  'prediction:scenario': { assetId: string; scenarios: Scenario[] };
};

class TypedEventBus {
  private emitter = new EventEmitter();

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.emitter.emit(event, data);
  }

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.emitter.on(event, handler);
  }
}
```

### Pattern 3: Python Bridge via Child Process IPC

**What:** MiroFish is a Python/Flask application. Rather than rewriting it in TypeScript or running it as a separate server, spawn it as a child process and communicate via JSON over stdin/stdout.

**When to use:** When integrating MiroFish's multi-agent simulation for deep scenario analysis (multi-day predictions, complex geopolitical scenario modeling).

**Trade-offs:** Subprocess startup is slow (2-5 seconds). Keep the MiroFish process long-lived with a request/response protocol over stdio. For short-term predictions (1-24h), use the native TypeScript Monte Carlo engine instead — it's faster and doesn't need agent simulation.

```typescript
class MiroFishBridge {
  private process: ChildProcess | null = null;

  async initialize(): Promise<void> {
    this.process = spawn('python', ['mirofish/bridge.py'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
  }

  async predict(request: MiroFishRequest): Promise<MiroFishResponse> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.process.stdin.write(JSON.stringify({ id, ...request }) + '\n');

      const handler = (chunk: Buffer) => {
        const response = JSON.parse(chunk.toString());
        if (response.id === id) {
          this.process.stdout.off('data', handler);
          resolve(response);
        }
      };
      this.process.stdout.on('data', handler);
    });
  }
}
```

### Pattern 4: Dual Prediction Strategy

**What:** Two prediction engines for different use cases. The TypeScript Monte Carlo engine handles fast, short-term predictions (1-24h). MiroFish handles deep, multi-day scenario analysis with agent-based simulation.

**When to use:** Always — different prediction horizons need different approaches.

**Trade-offs:** Two codebases to maintain, but each is optimized for its purpose. The Monte Carlo engine runs in milliseconds; MiroFish simulations take minutes. Users get fast signals for trading while deeper analysis runs in the background.

## Data Flow

### Primary Pipeline Flow

```
[Twitter/X Post] ─┐
[News Article]  ───┤
                   ▼
            [Event Bus: raw:*]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  [Event Classifier]   [Sentiment Analyzer]
         │                   │
         ▼                   ▼
  [classified:event]   [scored:sentiment]
         │                   │
         └────────┬──────────┘
                  ▼
          [Signal Aggregator]
          (combines event type + sentiment
           + current price + weights)
                  │
                  ▼
          [signal:aggregated]
                  │
         ┌────────┴────────┐
         ▼                 ▼
  [Monte Carlo        [MiroFish Bridge]
   (fast, 1-24h)]     (deep, 1-7d)]
         │                 │
         ▼                 ▼
  [prediction:scenario ───────────────]
                  │
         ┌────────┴────────┐
         ▼                 ▼
  [Dashboard WS]    [Report Generator]
```

### Price Feed Flow (Parallel)

```
[Binance WebSocket]
        │
        ▼
  [raw:price] → [Price Store (SQLite)]
        │
        ▼
  [Signal Aggregator] (price context for predictions)
        │
        ▼
  [Dashboard WS] (live price chart)
```

### Key Data Flows

1. **Event-to-Prediction Pipeline:** Raw social/news data enters, gets classified and sentiment-scored, then aggregated into signals that drive scenario generation. This is the core value loop. Latency target: raw tweet to first prediction scenario in under 30 seconds.

2. **Price Context Stream:** Binance WebSocket maintains a continuous price feed that provides real-time market context to the signal aggregator (is the market already reacting?) and the dashboard (live chart). This stream runs independently of the event pipeline.

3. **Report Generation Flow:** Triggered on-demand or on significant events. Pulls latest predictions, event history, and price data from storage. Uses Claude API to generate a narrative summary. Output is Markdown stored to disk.

## Build Order (Dependency Chain)

Build order matters because each layer depends on the one below it.

### Phase 1: Foundation
- **Event Bus** — everything depends on this
- **SQLite storage** — events and prices need persistence
- **Config system** — asset definitions, source configs, weight configs
- **Binance WebSocket** — simplest data source, immediate validation

### Phase 2: Ingestion
- **Twitter cascade** (start with FxTwitter Tier 1 only, add tiers later)
- **News RSS poller**
- Both emit `raw:*` events to the bus

### Phase 3: Processing
- **Event classifier** — depends on raw events existing
- **Sentiment analyzer** — depends on Claude API integration
- **Signal aggregator** — depends on classified events + sentiment scores + price data

### Phase 4: Prediction
- **Monte Carlo scenario engine** (TypeScript, fast) — depends on aggregated signals
- **MiroFish bridge** — depends on MiroFish being set up locally, can be deferred

### Phase 5: Presentation
- **Dashboard** — depends on prediction data to visualize
- **Report generator** — depends on predictions + event history

### Why This Order

1. **Bus + Storage first** because every component writes to storage and communicates via the bus. Building these first means every subsequent component can be tested in isolation.
2. **Price feed before Twitter** because Binance WebSocket is a single, reliable, well-documented API. Twitter cascade has 4 tiers of complexity. Getting price data flowing validates the entire ingestion->bus->storage pipeline with minimal risk.
3. **Processing before Prediction** because predictions are meaningless without classified, scored signals to feed them. The classifier and sentiment analyzer are where the geopolitical intelligence actually happens.
4. **Monte Carlo before MiroFish** because the TypeScript scenario engine can produce useful predictions immediately. MiroFish requires Python environment setup, OASIS, potentially Neo4j — it's a significant integration effort that shouldn't block the core product.
5. **Dashboard last** because it's the thinnest layer — it just visualizes data that already exists. Building it last means all the data it needs is already flowing.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single Mac (target) | Monolith process. SQLite for storage. EventEmitter for bus. Everything in one Node.js process + MiroFish subprocess. This is the target architecture. |
| Multi-asset (5-10 pairs) | Add asset-scoped event channels. Parallelize ingestion per asset. SQLite still fine. May need to throttle MiroFish calls. |
| Team/server deployment | Replace EventEmitter with Redis pub/sub. Replace SQLite with PostgreSQL. Add proper auth. Containerize MiroFish. |

### Scaling Priorities

1. **First bottleneck: Claude API rate limits.** Sentiment analysis calls are the most expensive operation. Batch tweets into groups of 10-20 for a single classification+sentiment call rather than one-per-tweet. Cache results for duplicate/similar content.
2. **Second bottleneck: MiroFish simulation time.** Agent-based simulations take minutes. Run them in the background, not in the request path. Cache results aggressively — the same geopolitical scenario doesn't need re-simulation every minute.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Prediction Pipeline

**What people do:** Build one giant function that ingests data, classifies it, scores sentiment, and generates predictions in a single synchronous chain.
**Why it's wrong:** Any failure in the chain kills everything. Can't test components independently. Can't add new data sources without touching prediction logic.
**Do this instead:** Event bus with independent consumers. Each component subscribes to what it needs, processes independently, emits results. Failures are isolated.

### Anti-Pattern 2: Real-Time LLM Calls in the Hot Path

**What people do:** Call Claude API synchronously for every incoming tweet, blocking the pipeline until the response comes back.
**Why it's wrong:** Claude API latency is 1-5 seconds. At 10 tweets/minute, you're spending more time waiting for API responses than processing data. Costs spiral.
**Do this instead:** Batch incoming events into time windows (e.g., 30 seconds). Send one classification+sentiment request for the batch. Use keyword-based pre-filtering to skip obviously irrelevant content before hitting the API.

### Anti-Pattern 3: Treating MiroFish as a Real-Time Engine

**What people do:** Call MiroFish for every signal update, expecting sub-second predictions.
**Why it's wrong:** MiroFish runs multi-agent simulations with LLM-powered agents. Each simulation takes minutes and costs API credits. It's designed for deep analysis, not real-time trading signals.
**Do this instead:** Use the TypeScript Monte Carlo engine for fast, short-term predictions. Reserve MiroFish for significant events that warrant deep scenario analysis (e.g., "Iran strikes detected" — run MiroFish to model 7-day scenarios). Trigger MiroFish runs based on signal magnitude thresholds.

### Anti-Pattern 4: Hardcoding Asset-Specific Logic

**What people do:** Scatter TRUMP-specific logic throughout the codebase — specific Twitter accounts, specific event weights, specific price thresholds.
**Why it's wrong:** The system should be asset-agnostic. When you want to add BTC or ETH, you'd have to rewrite half the processing layer.
**Do this instead:** Asset configuration files that define: which Twitter accounts to follow, event type weights, price feed pairs, prediction parameters. The codebase operates on generic `Asset` types, configured per deployment.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| FxTwitter (self-hosted) | HTTP REST, polling | Self-host for rate limit control. Free tier. Primary tweet source. |
| twitterapi.io | HTTP REST, polling | $0.15/1K tweets. Tier 2 fallback. API key auth. |
| X API v2 | HTTP REST, OAuth 2.0 | Official API. Expensive. Tier 3 fallback only. |
| Grok/xAI | HTTP REST | Last resort. Use for summarization when tweet data unavailable. |
| Binance | WebSocket (wss://stream.binance.com) | Persistent connection. Auto-reconnect required. Free. |
| Claude API | HTTP REST | Sentiment + classification. Batch calls. Rate limit: ~60 RPM on standard tier. |
| MiroFish/OASIS | Child process (stdin/stdout JSON) | Python subprocess. Long-lived process. Minutes per simulation. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Ingestion <-> Processing | Event Bus (typed events) | Loose coupling. Ingestion knows nothing about processing. |
| Processing <-> Prediction | Event Bus (aggregated signals) | Signal aggregator produces prediction-ready data. |
| Prediction <-> Dashboard | WebSocket + REST | WS for live scenario updates. REST for historical queries. |
| TypeScript <-> MiroFish | JSON over stdio | Keep the bridge thin. Serialize/deserialize at the boundary. |
| Backend <-> SQLite | better-sqlite3 (synchronous) | Synchronous SQLite is fine for single-process. No ORM needed. |

## Sources

- [MiroFish GitHub Repository](https://github.com/666ghj/MiroFish) - Core prediction engine architecture (HIGH confidence)
- [MiroFish DeepWiki](https://deepwiki.com/666ghj/MiroFish) - Detailed architecture breakdown (MEDIUM confidence)
- [MiroFish-Offline Fork](https://github.com/nikmcfly/MiroFish-Offline) - Neo4j + Ollama local stack variant (MEDIUM confidence)
- [Path Dependent Monte Carlo Simulation for Crypto](https://arxiv.org/html/2405.12988v1) - Academic basis for scenario price paths (HIGH confidence)
- [Event-Based Architectures in JavaScript](https://www.freecodecamp.org/news/event-based-architectures-in-javascript-a-handbook-for-devs/) - Event bus patterns for Node.js (MEDIUM confidence)
- [Crypto Sentiment Analysis Trading Strategy](https://www.coingecko.com/learn/crypto-sentiment-analysis-trading-strategy) - Sentiment scoring patterns (MEDIUM confidence)
- [Prediction Markets: Event-Driven Finance](https://crypto.com/us/research/prediction-markets-oct-2025) - Market structure context (MEDIUM confidence)

---
*Architecture research for: GeoPredict - Real-time geopolitical event-driven crypto price prediction*
*Researched: 2026-03-16*
