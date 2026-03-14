# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript 5.3.3 - All source code, both backend and Next.js frontend

**Secondary:**
- JavaScript - Package scripts and build tools
- Bash - Shell scripts for CLI operations

## Runtime

**Environment:**
- Node.js (ES2022 target, no .nvmrc specified - inferred 18+ LTS)

**Package Manager:**
- npm
- Lockfile: package-lock.json present

## Frameworks

**Core Backend:**
- Express.js 4.18.2 - API server for pipeline orchestration
- tsx 4.7.0 - TypeScript execution runner for CLI tools

**Frontend:**
- Next.js 15.1.4 - Dashboard UI for content management (port 5175)
- React 19.0.0 - Component library
- Tailwind CSS 3.4.1 - Styling
- Lucide React 0.469.0 - Icon library
- @heroicons/react 2.2.0 - Additional icon library

**Testing:**
- Jest 29.7.0 - Test runner
- Type checking: TypeScript strict mode

**Build/Dev:**
- tsx 4.7.0 - TypeScript runner without compilation step
- Next.js built-in build system
- TypeScript 5.3.3 - Compilation to ES2022

## Key Dependencies

**Critical Services:**
- @anthropic-ai/sdk 0.32.1 - Claude API for content generation and reasoning
- openai 4.72.0 - OpenAI API for DALL-E 3 image generation
- @google-cloud/aiplatform 6.1.0 - Google Vertex AI Imagen for image generation
- twitter-api-v2 1.15.2 - Twitter X API v2 for monitoring influencers and trends
- axios 1.6.5 - HTTP client for API calls (RapidAPI, Typefully, external services)

**Database:**
- better-sqlite3 12.6.2 - SQLite wrapper for marketing content history (primary database)
- postgres 3.4.3 - PostgreSQL client (optional, configured via DATABASE_URL)

**Content Sources & Monitoring:**
- cheerio 1.0.0-rc.12 - HTML parsing for Paragraph blog scraping
- puppeteer 22.0.0 - Browser automation for content monitoring
- @linear/sdk 24.0.0 - Linear issue tracking API client
- @octokit/rest 20.0.2 - GitHub REST API client
- @kynesyslabs/demosdk latest - Demos Network cross-chain SDK

**Content Generation & Processing:**
- sharp 0.33.2 - Image processing and manipulation
- canvas 2.11.2 - Node.js Canvas for image overlays and rendering
- zod 3.22.4 - Type-safe schema validation

**Scheduling & Utilities:**
- node-cron 3.0.3 - Task scheduling for pipeline runs
- date-fns 3.3.1 - Date manipulation and formatting
- dotenv 16.4.1 - Environment variable loading

**Dev Dependencies:**
- @typescript-eslint/eslint-plugin 6.19.1 - TypeScript linting rules
- @typescript-eslint/parser 6.19.1 - TypeScript parser for ESLint
- eslint 8.56.0 - Code linting
- prettier 3.2.4 - Code formatting
- @types/* - Type definitions for Node.js, Express, node-cron, better-sqlite3

## Configuration

**Environment Variables:**

Primary service credentials:
- `ANTHROPIC_API_KEY` - Claude API authentication (note: CLI uses API credits if set vs. OAuth)
- `OPENAI_API_KEY` - OpenAI/DALL-E authentication
- `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID for Imagen
- `GOOGLE_CLOUD_LOCATION` - GCP location (default: us-central1)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCP service account JSON

Social/monitoring APIs:
- `TWITTER_BEARER_TOKEN` - Twitter API v2 bearer token
- `TWITTER_API_KEY` - Twitter API key
- `TWITTER_API_SECRET` - Twitter API secret
- `TWITTER_ACCESS_TOKEN` - Twitter OAuth access token
- `TWITTER_ACCESS_SECRET` - Twitter OAuth access secret
- `RAPIDAPI_KEY` - RapidAPI key for Twitter API45 (brand learning)
- `TYPEFULLY_API_KEY` - Typefully v2 API authentication
- `TYPEFULLY_ACCOUNT_ID` - Typefully social set ID (optional, auto-resolved)

Developer platform APIs:
- `LINEAR_API_KEY` - Linear workspace API key
- `LINEAR_TEAM_ID` - Linear team identifier
- `GITHUB_TOKEN` - GitHub PAT for DemoSDK repo access
- `GITHUB_ORG` - GitHub organization (defaults: randomblocker)
- `GITHUB_REPO` - GitHub repo (defaults: demosdk)

Database:
- `DATABASE_URL` - PostgreSQL connection string (optional; SQLite is primary)

Application:
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - info/debug/warn/error

Pipeline Configuration:
- `MAX_DRAFTS_PER_RUN` - Maximum drafts generated per pipeline execution
- `MAX_DRAFTS_PER_DAY` - Daily limit on draft generation
- `MIN_RELEVANCE_SCORE` - Minimum relevance threshold (0.0-1.0, typically 0.4)
- `PIPELINE_INTERVAL_HOURS` - Time between pipeline runs (hours)

Feature Flags:
- `ENABLE_VISUAL_GENERATION` - Enable image generation (true/false)
- `ENABLE_BRAND_REVIEW` - Enable brand alignment review step
- `ENABLE_BRAND_LEARNING` - Enable brand voice learning from published content
- `BRAND_PROFILE_UPDATE_HOURS` - Hours between brand profile updates (default: 168)
- `BRAND_LEARN_FROM_PARAGRAPH` - Learn brand voice from Paragraph posts
- `MONITOR_CRYPTO_INFLUENCERS` - Monitor crypto influencer tweets
- `MONITOR_REDDIT` - Monitor Reddit discussions
- `MONITOR_NEWS_FEEDS` - Monitor news feed sources
- `DRY_RUN` - Run pipeline without publishing (test mode)
- `USE_IMAGEN` - Use Google Imagen instead of DALL-E
- `USE_DATABASE` - Use SQLite database for content history
- `USE_ENHANCED_AI` - Enable enhanced multi-step reasoning AI

Network:
- `DEMOS_RPC_URL` - Demos Network RPC endpoint (default: https://demosnode.discus.sh/)
- `DEMOS_DEV_URL` - Demos Network dev endpoint (default: https://dev.node2.demos.sh/)

**Build Targets:**
- TypeScript target: ES2022
- Module system: CommonJS for backend, ESM for Next.js
- Output directory: `dist/` for backend CLI/server code
- Next.js output: standard Next.js build directory

## Platform Requirements

**Development:**
- Node.js 18+ LTS (ES2022 support required)
- npm 8+
- SQLite 3.x (bundled with better-sqlite3)
- Linux/macOS/Windows with native C++ compilation support (canvas, sharp, better-sqlite3 require build tools)

**Production:**
- Node.js 18+ LTS
- SQLite 3.x for local data persistence
- Optional: PostgreSQL 12+ for production database
- Optional: Google Cloud credentials for Vertex AI Imagen
- Sufficient disk space for generated images (`./generated-images/` directory)
- Port 3000 (API), 5175 (Dashboard)

**External Service Access Required:**
- Twitter API (rate limits apply)
- OpenAI API (or Google Vertex AI)
- Linear workspace API
- Anthropic Claude API
- Typefully service
- Internet access for Paragraph scraping

---

*Stack analysis: 2026-03-14*
