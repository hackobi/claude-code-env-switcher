# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Modular monorepo with independent project-based architecture

**Key Characteristics:**
- Multiple independent projects in `/Users/jacobo/Documents/Claude/` root, each self-contained
- Mix of backend services, frontend applications, and CLI tools
- Layered architecture within projects (services, components, utilities, integrations)
- Data-driven pipelines with clear input → processing → output flow

## Layers

**Presentation Layer:**
- Purpose: UI components, user-facing interfaces
- Location: `*/src/components/`, `*/src/app/`
- Contains: React/Next.js components, pages, UI logic
- Depends on: Service layer, utilities, stores
- Used by: Browser, API clients

**Service/Integration Layer:**
- Purpose: External API communication, business logic orchestration
- Location: `*/src/services/`, `*/src/integrations/`
- Contains: API clients (Twitter, Linear, Typefully), data adapters
- Depends on: External SDKs, utilities
- Used by: Application layer, workflows, CLI

**Application/Workflow Layer:**
- Purpose: Complex operations combining multiple services
- Location: `*/src/workflows/`, `*/src/cli/`
- Contains: Pipeline orchestrators, CLI commands, batch operations
- Depends on: Service layer, database layer, agents
- Used by: Entry points (main.ts, CLI tools)

**Data/Storage Layer:**
- Purpose: Persistence and state management
- Location: `*/src/database/`, `*/data/`, `*/src/stores/`
- Contains: Database schemas, ORM/migrations, state stores (Zustand, etc.)
- Depends on: External databases (SQLite, PostgreSQL)
- Used by: Service layer, workflows

**Agent/Intelligence Layer:**
- Purpose: AI-powered decision making and content generation
- Location: `*/src/agents/`, `*/src/content/`, `*/src/learning/`
- Contains: Claude API wrappers, brand learning, relevance scoring
- Depends on: Service layer, models
- Used by: Workflows, application layer

**Utility Layer:**
- Purpose: Shared helpers and cross-cutting concerns
- Location: `*/src/lib/`, `*/src/utils/`, `*/src/utilities/`
- Contains: Cryptography, formatting, logging, helpers
- Depends on: Standard library, npm packages
- Used by: All other layers

## Data Flow

**Marketing Intelligence Pipeline (demos-marketing-intelligence):**

1. Twitter/Trend Monitoring → `TwitterRapidAPI` service fetches current trends
2. Content Scoring → `RelevanceScorer` evaluates fit with brand
3. AI Generation → `AIContentGenerator` or `EnhancedAIContentGenerator` creates draft
4. Brand Review → `BrandingAgent` validates against brand voice
5. Visual Generation → `ImageGenerator` or `ImagenGenerator` creates images
6. Database Storage → `ContentDatabase` persists with metadata
7. Typefully Integration → `TypefullyClient` schedules/publishes

**State Management:**
- Within-service: Constructor-injected dependencies
- Within-application: Service instances shared via constructor injection
- Persistence: SQLite database (`better-sqlite3`) for content history
- Configuration: Environment variables via dotenv

## Key Abstractions

**ContentPipeline:**
- Purpose: Main orchestrator combining all marketing services
- Examples: `demos-marketing-intelligence/src/workflows/content-pipeline.ts`
- Pattern: Class-based with dependency injection, configuration object for feature flags

**ServiceClients:**
- Purpose: Adapter pattern wrapping external APIs
- Examples: `TypefullyClient`, `TwitterRapidAPI`, `LinearIntegration`, `AIContentGenerator`
- Pattern: Static methods for HTTP client, instance methods for stateful operations

**Database Abstractions:**
- Purpose: Type-safe database queries
- Examples: `ContentDatabase`, `TweetRecord`, `GeneratedContentRecord`
- Pattern: Class wrapping SQLite with typed interfaces for records

**React Components (ralph-gui, simple-prediction-app):**
- Purpose: Reusable UI building blocks
- Pattern: Functional components with hooks, stores via Zustand
- Examples: `MarketCard`, `WalletModal`, `LogViewer`

**Blockchain/Web3 Integration (kynesys-node, dwarf-fortress-nft-game):**
- Purpose: Multi-chain operations
- Examples: `GCR`, `XMDispatcher`, blockchain routines
- Pattern: Feature-based organization with executors for chain-specific operations

## Entry Points

**Content Pipeline:**
- Location: `demos-marketing-intelligence/src/workflows/content-pipeline.ts`
- Triggers: `npm run pipeline` or scheduled via node-cron
- Responsibilities: Initialize services, run monitoring loop, handle scheduling

**Ralph GUI:**
- Location: `ralph-gui/src/app/page.tsx`
- Triggers: HTTP request to `localhost:3000`
- Responsibilities: Project management, Claude loop orchestration, status monitoring

**Demos Node:**
- Location: `kynesys-node/src/index.ts`
- Triggers: `npm start` or node executable
- Responsibilities: Network initialization, peer discovery, RPC server, MCP integration

**Simple Prediction App:**
- Location: `simple-prediction-app/src/main.tsx`
- Triggers: Vite dev server or bundled SPA
- Responsibilities: Market UI, wallet connection, betting interface

**SpaceFort Game Server:**
- Location: `dwarf-fortress-nft-game/SpaceFort/game-server.js`
- Triggers: `npm start`
- Responsibilities: Game state, blockchain integration, agent gateway

## Error Handling

**Strategy:** Try-catch with error objects returned in response envelopes

**Patterns:**
- HTTP responses include `{ success: boolean, data?: T, error?: string }`
- Service methods throw on critical failures, return null/empty on soft failures
- Database errors propagate with context (table, operation, cause)
- External API errors caught and wrapped with fallback data

## Cross-Cutting Concerns

**Logging:**
- Simple projects: `console.log/error`
- Complex projects: Custom `CategorizedLogger` (kynesys-node) with TUI support
- Pipeline: Timestamped logs for batch operations

**Validation:**
- TypeScript interfaces for type safety (primary mechanism)
- Zod schemas (demos-marketing-intelligence) for runtime validation
- No intermediate validation layers—trust interface compliance

**Authentication:**
- Services: API keys from environment variables
- Web3: Wallet signatures via SDK (DemoSDK)
- CLI: OAuth via Claude Code integration

**Configuration:**
- Monorepo: Each project has own `package.json` and tsconfig
- Runtime: Environment variables + config objects in code
- CLI: Command-line arguments parsed in index.ts
