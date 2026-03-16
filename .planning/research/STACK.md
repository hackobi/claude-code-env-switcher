# Technology Stack

**Project:** GeoPredict
**Researched:** 2026-03-16

## Critical Stack Decision: Python-First vs TypeScript-First

The most consequential stack decision is the primary language. MiroFish is Python. The ML/data pipeline is naturally Python. The question is whether to wrap it in a TypeScript/Node.js shell or stay Python-native.

**Recommendation: Python-first with Streamlit dashboard.**

**Rationale:**
- MiroFish requires Python 3.11-3.12 -- this is a hard constraint
- All prediction, ML, and data processing libraries are Python-native (python-binance, feedparser, anthropic SDK, scikit-learn, pandas, numpy)
- Adding TypeScript creates a polyglot codebase where the main value (prediction) lives in Python but gets orchestrated from TypeScript -- unnecessary complexity
- MiroFish integration via child process IPC (the TypeScript approach) adds serialization overhead and debugging pain. Running in the same Python process is simpler
- Streamlit eliminates the need for a separate frontend codebase entirely. `st.fragment(run_every=N)` handles real-time updates. Plotly integration is native
- Single-user local app does not benefit from Node.js's concurrency model -- Python's asyncio is sufficient
- The only argument for TypeScript is "better for web UIs" -- but Streamlit handles this use case well enough without maintaining two codebases

**The counter-argument (TypeScript):** If you wanted a polished multi-user web app with custom UI components, Next.js would be the better choice. But this is a single-user local analysis tool. Streamlit gets you 90% of the UI with 10% of the effort.

## Recommended Stack

### Core Prediction Engine

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MiroFish | latest (main) | Multi-agent simulation prediction engine | Project requirement. Uses OASIS for agent simulation, GraphRAG for knowledge graphs | MEDIUM |
| Python | 3.11-3.12 | Runtime | MiroFish hard constraint: >=3.11, <=3.12 | HIGH |
| uv | latest | Python package manager | MiroFish uses uv. 10-100x faster than pip. Handles venvs automatically | HIGH |
| Node.js | 18+ | MiroFish frontend + FxTwitter | Required by MiroFish's Vue frontend and FxTwitter Cloudflare Worker | HIGH |

### Data Ingestion Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| python-binance | 1.0.35 | Binance price data + WebSocket streams | Most popular Python Binance library. ThreadedWebsocketManager for real-time OHLCV. Supports TRUMP/USDT and all pairs | HIGH |
| feedparser | 6.0.12 | RSS feed ingestion | Universal feed parser for RSS 0.9x-2.0 and Atom. Zero extra deps, battle-tested | HIGH |
| GNews | 0.4.3 | Google News search | Lightweight Google News RSS wrapper. Geographic/topic filtering. Free, no API key | MEDIUM |
| aiohttp | 3.9+ | Async HTTP client | For FxTwitter and twitterapi.io REST calls. Async-native, pairs with asyncio | HIGH |

### Twitter/X Data Cascade (4-Tier)

| Tier | Technology | Cost | Purpose | Notes |
|------|-----------|------|---------|-------|
| 1 | FxTwitter (self-hosted) | Free | Tweet content extraction | Cloudflare Worker (TypeScript). Free Cloudflare plan. No API keys. Limitation: individual tweets, not search |
| 2 | twitterapi.io | $0.15/1K tweets | Tweet search + bulk retrieval | REST API, drop-in X API replacement. 100K free credits for new accounts |
| 3 | X API v2 (Basic) | $100/mo | Official search, 15K tweets/mo | Fallback only. Rate-limited, expensive per tweet |
| 4 | Grok 2 / xAI API | Per-token | AI-synthesized Twitter intelligence | Last resort. Summaries of trends, not raw tweets |

### AI / ML Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| anthropic (SDK) | 0.84.0 | Claude API for sentiment + classification | Structured outputs (beta since Nov 2025) enable typed JSON with Pydantic. Use Claude Sonnet for cost-efficient sentiment scoring | HIGH |
| Pydantic | 2.x | Data validation + structured AI output | Defines schemas for event classification, sentiment scores, scenario parameters. Works with anthropic SDK structured outputs | HIGH |
| scikit-learn | 1.4+ | Lightweight ML models | Feature engineering, ensemble scoring. Avoid PyTorch/TensorFlow unless MiroFish requires them | MEDIUM |
| numpy | latest | Numerical computation | Monte Carlo simulation, array operations. Already a dependency of most ML libraries | HIGH |
| pandas | 2.x | Data manipulation | Time-series price data, aggregation. Use for data manipulation, not as architecture backbone | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| SQLite | 3.x (stdlib) | Primary data store | Single-user, local Mac. No server process. Python stdlib. Handles price data, events, predictions. 100GB+ capacity | HIGH |
| Zep Cloud | latest | Agent memory (MiroFish req) | MiroFish uses Zep for agent memory persistence. Required for simulation engine | MEDIUM |

### Dashboard

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Streamlit | 1.55.0 | Dashboard UI | Best fit for single-user Python data apps. `st.fragment(run_every=N)` for real-time updates without full reruns. Native Plotly support. No frontend code needed | HIGH |
| Plotly | 5.x | Interactive charts | Scenario visualization: multi-line trajectories, probability cones, candlesticks. Interactive zoom/hover. `st.plotly_chart()` | HIGH |

### Infrastructure / Orchestration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| asyncio | stdlib | Async event loop | Core orchestration for concurrent ingestion (prices + tweets + news). No broker needed for single-process app | HIGH |
| APScheduler | 3.10+ | Job scheduling | Schedule periodic pulls (RSS/5min, Twitter/15min). Lighter than Celery, no Redis/RabbitMQ. In-process | HIGH |
| Docker / docker-compose | latest | MiroFish deployment option | MiroFish supports containerized deployment. Use if dependency isolation needed | MEDIUM |

### Configuration / Environment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| python-dotenv | 1.0+ | Environment variables | Load API keys from .env file | HIGH |
| pydantic-settings | 2.x | Typed configuration | Extends Pydantic for settings. Validates on startup, catches missing keys | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Primary Language | Python | TypeScript/Node.js | MiroFish is Python. ML ecosystem is Python. Adding TS creates polyglot complexity. IPC bridge vs in-process -- in-process wins for single-user |
| Dashboard | Streamlit | Next.js/React | Requires separate frontend codebase + REST API layer. 10x more code for marginally better UI. Not worth it for single-user |
| Dashboard | Streamlit | Plotly Dash | Dash is better for multi-user production. Overkill here. More boilerplate (Flask callbacks vs script-rerun) |
| Database | SQLite | PostgreSQL | Requires server process. No benefit for single-user local app |
| Database | SQLite | TimescaleDB | PG extension for time-series. Powerful but requires PG server. SQLite with indexing handles our volume |
| Task Queue | asyncio + APScheduler | Celery | Celery needs Redis/RabbitMQ broker. Overkill for single-process. No native asyncio support |
| Binance SDK | python-binance | binance-connector | Official but less adoption, fewer examples. python-binance has better docs + WebSocket support |
| News | GNews + feedparser | NewsCatcher API | Paid service. GNews + RSS is free and sufficient |
| AI Sentiment | Claude API | OpenAI GPT-4 | Project specifies Claude. Structured outputs work well. GPT-OS-120B planned for v2 |
| Pkg Manager | uv | pip/poetry | MiroFish uses uv. 10-100x faster. No reason to use anything else |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| TypeScript as primary language | MiroFish is Python. All ML libs are Python. IPC bridge adds complexity and debugging pain for zero benefit on a single-user local app |
| Next.js / React | Separate frontend codebase for a single-user tool. Streamlit eliminates the need |
| PyTorch/TensorFlow (direct) | Only use if MiroFish OASIS requires them. Don't add heavy ML frameworks for custom code |
| Kafka / RabbitMQ | Message brokers for distributed systems. This is single-process |
| Redis | No need for cache or pub/sub. SQLite + Python dicts handle state |
| FastAPI | Only needed for REST API. Streamlit serves UI directly. No API layer for v1 |
| Jupyter Notebooks | Fine for exploration. Not for production pipeline code |
| Pandas as architecture backbone | Use for data manipulation. Don't build architecture around DataFrames. Use Pydantic models |
| Neo4j | MiroFish-Offline fork uses it but official MiroFish uses GraphRAG without requiring Neo4j. Avoid the operational overhead |

## Installation

```bash
# Clone MiroFish
git clone https://github.com/666ghj/MiroFish.git
cd MiroFish

# MiroFish setup (uses uv)
cp .env.example .env
npm install
npm run setup:backend

# GeoPredict custom dependencies (in MiroFish venv or separate)
uv pip install python-binance==1.0.35 \
    anthropic>=0.84.0 \
    feedparser==6.0.12 \
    gnews==0.4.3 \
    aiohttp>=3.9 \
    streamlit>=1.55.0 \
    plotly>=5.0 \
    apscheduler>=3.10 \
    pydantic>=2.0 \
    pydantic-settings>=2.0 \
    python-dotenv>=1.0 \
    scikit-learn>=1.4 \
    numpy \
    pandas>=2.0

# FxTwitter (separate, Cloudflare Worker)
git clone https://github.com/FixTweet/FxTwitter.git
cd FxTwitter
cp .env.example .env
npx wrangler login
npx wrangler publish
```

## Environment Variables Required

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...          # Claude API for sentiment + classification
BINANCE_API_KEY=...                    # Binance read-only API key
BINANCE_API_SECRET=...                 # Binance API secret
TWITTERAPI_IO_KEY=...                  # twitterapi.io API key
LLM_API_KEY=...                        # MiroFish LLM (Qwen or OpenAI-compatible)
LLM_BASE_URL=...                       # MiroFish LLM endpoint
LLM_MODEL_NAME=qwen-plus               # MiroFish LLM model
ZEP_API_KEY=...                        # Zep Cloud for MiroFish agent memory
FXTWITTER_URL=https://your-worker.workers.dev  # Self-hosted FxTwitter
```

## Version Compatibility Matrix

| Component | Python Version | Node Version | Notes |
|-----------|---------------|--------------|-------|
| MiroFish | 3.11-3.12 | 18+ | Hard constraint from upstream |
| python-binance | 3.7+ | - | Compatible |
| Streamlit | 3.9+ | - | Compatible |
| anthropic SDK | 3.9+ | - | Compatible |
| FxTwitter | - | 18+ | Cloudflare Worker (TypeScript) |

**Constraining factor: Python 3.11-3.12** (MiroFish requirement). All other Python packages support this range.

## Cost Projections

| Service | Free Tier | Estimated Monthly (Active Use) | Notes |
|---------|-----------|-------------------------------|-------|
| Claude API (Sonnet) | - | $20-80 | Depends on tweet volume. Batch 10-20 tweets per call. ~$0.003/1K input tokens |
| twitterapi.io | 100K credits | $5-15 | $0.15/1K tweets. Tier 2 fallback only |
| Binance API | Free | $0 | WebSocket and REST are free for market data |
| FxTwitter (self-hosted) | Free (Cloudflare Workers) | $0 | Free tier: 100K requests/day |
| GNews / RSS | Free | $0 | No API keys needed |
| MiroFish LLM (Qwen-Plus) | - | $10-50 | DashScope pricing. Depends on simulation frequency |
| Zep Cloud | Free tier | $0-20 | Depends on agent memory volume |
| **Total** | | **$35-165/mo** | Heavy use during geopolitical crisis days |

## Sources

- [MiroFish GitHub](https://github.com/666ghj/MiroFish) - MEDIUM confidence (repo docs, not fully verified locally)
- [python-binance PyPI](https://pypi.org/project/python-binance/) - HIGH confidence (v1.0.35)
- [anthropic PyPI](https://pypi.org/project/anthropic/) - HIGH confidence (v0.84.0, Feb 2026)
- [Streamlit PyPI](https://pypi.org/project/streamlit/) - HIGH confidence (v1.55.0, Mar 2026)
- [Streamlit st.fragment docs](https://docs.streamlit.io/develop/api-reference/execution-flow/st.fragment) - HIGH confidence
- [feedparser PyPI](https://pypi.org/project/feedparser/) - HIGH confidence (v6.0.12)
- [GNews PyPI](https://pypi.org/project/gnews/) - MEDIUM confidence (v0.4.3)
- [FxTwitter/FixTweet GitHub](https://github.com/FixTweet/FxTwitter) - HIGH confidence
- [FxTwitter Deploy Docs](https://docs.fxtwitter.com/en/latest/deploy/index.html) - HIGH confidence
- [twitterapi.io pricing](https://twitterapi.io/blog/twitter-api-pricing-2025) - MEDIUM confidence
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - HIGH confidence
