# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**AI & Content Generation:**
- **Anthropic Claude** - Primary AI for content generation and reasoning
  - SDK: `@anthropic-ai/sdk` 0.32.1
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Usage: `src/content/ai-generator.ts`, `src/content/ai-generator-enhanced.ts`, `src/agents/branding-agent.ts`
  - Note: When CLI spawned with `ANTHROPIC_API_KEY` in env, it uses API credits instead of OAuth; fix by stripping from `process.env` before spawning child Claude processes

- **OpenAI DALL-E 3** - Image generation (alternative to Google Imagen)
  - SDK: `openai` 4.72.0
  - Auth: `OPENAI_API_KEY` environment variable
  - Endpoint: `https://api.openai.com/v1/images`
  - Usage: `src/visual/image-generator.ts`
  - Model: DALL-E 3

- **Google Vertex AI Imagen** - Image generation (preferred, optionally replaces DALL-E)
  - SDK: `@google-cloud/aiplatform` 6.1.0
  - Auth: `GOOGLE_APPLICATION_CREDENTIALS` (GCP service account JSON), `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`
  - Endpoint: Vertex AI PredictionServiceClient (`{location}-aiplatform.googleapis.com`)
  - Usage: `src/visual/imagen-generator.ts`
  - Model: `imagen-3.0-generate-001`
  - Feature flag: `USE_IMAGEN=true` to enable

**Social Media & Monitoring:**
- **Twitter/X API v2** - Monitor crypto influencers and trending topics
  - SDK: `twitter-api-v2` 1.15.2
  - Auth: `TWITTER_BEARER_TOKEN` (required), `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`
  - Usage: `src/integrations/twitter.ts`, crypto influencer monitoring
  - Features: Tweet search, user lookup, trend detection
  - Monitored influencers: 50+ crypto analysts (aixbt_agent, zacxbt, hosseeb, etc.) defined in `CRYPTO_INFLUENCERS` array

- **Twitter API45 (RapidAPI)** - Cost-effective tweet search for brand learning
  - SDK: HTTP via `axios`
  - Auth: `RAPIDAPI_KEY` environment variable
  - Endpoint: RapidAPI proxy for Twitter data
  - Usage: `src/learning/brand-voice-learner.ts` for brand profile learning
  - Reason: More cost-effective than direct API v2 for historical data

- **Typefully** - Content scheduling and publishing platform
  - SDK: Custom axios-based client `TypefullyClient`
  - Auth: `TYPEFULLY_API_KEY` (v2 API Bearer token)
  - Endpoint: `https://api.typefully.com/v2`
  - Usage: `src/integrations/typefully.ts`
  - Features: Draft creation, scheduling, thread management, media upload
  - Social sets: Auto-resolves from account if `TYPEFULLY_ACCOUNT_ID` not provided
  - Output: Stores `typefully_id` in database for tracking published content

**Content Sources & Monitoring:**
- **Paragraph (Web Scraping)** - Demos blog for brand voice learning
  - Method: Cheerio HTML parsing + Puppeteer browser automation
  - URL: `https://paragraph.com/@demos`
  - Usage: `src/integrations/paragraph.ts`
  - Feature flag: `BRAND_LEARN_FROM_PARAGRAPH=true`
  - Data: Blog posts, announcements, technical articles

- **Linear** - Task/issue tracking for milestone content generation
  - SDK: `@linear/sdk` 24.0.0 (official Linear client)
  - Auth: `LINEAR_API_KEY` environment variable
  - Team ID: `LINEAR_TEAM_ID` environment variable
  - Usage: `src/integrations/linear.ts`
  - Features: Fetch completed tasks, query by label, extract milestones
  - Use case: Generate marketing content when features ship/tasks complete

- **GitHub** - Demo SDK repository monitoring
  - SDK: `@octokit/rest` 20.0.2
  - Auth: `GITHUB_TOKEN` (Personal Access Token)
  - Org/Repo: `GITHUB_ORG`, `GITHUB_REPO` environment variables (default: randomblocker/demosdk)
  - Usage: Content source for SDK updates
  - Data: Releases, commits, issues as content triggers

- **Demos Network** - Native blockchain integration
  - SDK: `@kynesyslabs/demosdk` latest
  - RPC endpoints: `DEMOS_RPC_URL`, `DEMOS_DEV_URL`
  - Usage: Verify on-chain data, cross-chain context
  - Purpose: Validate marketing claims against network state

## Data Storage

**Primary Database:**
- **SQLite 3.x** (better-sqlite3)
  - Location: `./data/marketing.db` (created on first run)
  - Mode: WAL (Write-Ahead Logging) for concurrency
  - Tables:
    - `tweets` - Monitored tweets from influencers and search
    - `articles` - Content from Paragraph, blog, docs
    - `linear_tasks` - Completed Linear issues
    - `generated_content` - Generated marketing drafts with metadata
    - `content_hashes` - Deduplication cache
    - `pipeline_runs` - Execution history and metrics
  - Indexes: On source, created_at, processed, status for query optimization
  - Usage: `src/database/index.ts` exports `ContentDatabase` class with transaction support

**Optional Database:**
- **PostgreSQL** (postgres driver)
  - Connection: `DATABASE_URL` environment variable (postgresql://user:pass@host:port/dbname)
  - Status: Configured but not primary; SQLite handles all current data
  - Purpose: Production deployment option for multi-process scaling

**File Storage:**
- **Local filesystem** - Generated images and base64 assets
  - Directory: `./generated-images/`
  - Subpaths: Named by timestamp and content type
  - Types: Final composited images (logo + tagline overlay), base images (for re-applying taglines)
  - Processed by: `sharp` for image manipulation, `canvas` for overlays

**Session Storage:**
- **Memory** - Pipeline state during execution (not persistent)
- **File-based** - Brand profile snapshots in local storage (used by BrandVoiceLearner)

## Caching

**Not explicitly integrated** - No Redis/Memcached
- Content deduplication: In-database via `content_hashes` table with simple hash function
- API response caching: Minimal, relies on rate limit buffering

## Authentication & Identity

**Auth Method:** API Key / Token-based (no OAuth server)

**Service Authentication:**
- Anthropic: API Key
- OpenAI: API Key
- Google Cloud: Service account credentials (JSON file)
- Twitter/X: Bearer token + OAuth credentials
- Linear: API Key
- GitHub: Personal Access Token
- Typefully: Bearer token (v2 API)
- RapidAPI: API Key in header
- Demos Network: RPC endpoint public access

**Identity Verification:**
- None - No user authentication system
- All access controlled via environment variable secrets

## Monitoring & Observability

**Error Tracking:**
- Not integrated - No external error tracking service (Sentry, etc.)
- Errors logged to console and optionally stored in `pipeline_runs` table

**Logs:**
- Standard: Console output (`console.log`, `console.error`)
- Level: Controlled via `LOG_LEVEL` environment variable (info/debug/warn/error)
- Storage: Ephemeral (not persisted unless redirected)

**Metrics & Analytics:**
- Database: Pipeline execution stats stored in `pipeline_runs` table
  - tweets_processed, tasks_processed, drafts_created per run
  - execution duration (started_at, completed_at)
  - error logs as JSON

**Health Checks:**
- Not implemented - No dedicated healthcheck endpoint
- Express server runs on `PORT` environment variable

## CI/CD & Deployment

**Hosting:**
- Deployment target: Self-hosted Node.js environment
- No Docker configuration detected
- Can run as systemd service or process manager (PM2, etc.)

**CI Pipeline:**
- Not configured - No GitHub Actions, GitLab CI, or similar
- Manual deployment from source

**Build Process:**
- Backend: `npm run build` → TypeScript compiled to `dist/` via tsc
- Frontend (Dashboard): `npm run build` in dashboard/ → Next.js production build
- Local dev: `npm run dev` (tsx watch for backend, next dev for dashboard)

**Execution:**
- Backend CLI: `tsx src/workflows/content-pipeline.ts` (no compilation)
- Backend server: `node dist/index.js` (compiled)
- Dashboard: `next dev -p 5175` or `next start -p 5175`
- Pipeline scheduler: `node-cron` within Express server

**Deployment Requirements:**
- Environment: Requires all `.env` variables populated
- Database: SQLite auto-initialized on first run
- Storage: Write access to `./data/`, `./generated-images/` directories
- Network: Outbound HTTPS to all external APIs

## Environment Configuration

**Configuration Files:**
- `.env` - Local development (NOT committed, contains secrets)
- `.env.example` - Template with all required variables documented
- Both in project root

**Secrets Location:**
- Environment variables only
- No config files with inline secrets
- All credentials loaded at startup from process.env

**Settings Override Hierarchy:**
1. Environment variables (highest priority)
2. Hardcoded defaults in code (lowest priority)
3. Example: Feature flags checked via `process.env.ENABLE_BRAND_LEARNING === 'true'`

## Webhooks & Callbacks

**Incoming:**
- None implemented - No webhook endpoints for third-party pushes

**Outgoing:**
- Typefully: Sends drafts via API (POST `/social-sets/{id}/drafts`)
- No bidirectional sync or callback handlers

**Data Flow:**
1. Pipeline monitoring triggers (Twitter trends, Linear tasks, Paragraph posts)
2. Content generation (Claude API)
3. Image generation (OpenAI or Google Imagen)
4. Storage in SQLite
5. Dashboard UI reads from database
6. Manual/automatic publishing to Typefully

## Integration Patterns

**Content Pipeline Architecture:**
- Monitor multiple sources → Aggregate data → Generate content → Score relevance → Filter by brand alignment → Store drafts → Push to publishing platform

**Data Fetching:**
- Polling-based via node-cron scheduler (no webhooks)
- `PIPELINE_INTERVAL_HOURS` controls frequency
- Batch operations for efficiency (insert tweets in transactions)

**Error Handling:**
- Graceful degradation: Missing API keys skip their features
- Example: If `OPENAI_API_KEY` missing, image generation skipped but content still generated
- Fallback generator available if all AI services fail

**Rate Limiting:**
- Handled implicitly by external APIs
- No client-side rate limiter implemented
- Content generation throttled by `MAX_DRAFTS_PER_RUN` and `MAX_DRAFTS_PER_DAY` limits

---

*Integration audit: 2026-03-14*
