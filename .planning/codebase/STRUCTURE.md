# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
/Users/jacobo/Documents/Claude/
├── demos-marketing-intelligence/          # AI marketing automation pipeline
│   ├── src/
│   │   ├── workflows/                     # Main pipeline orchestrator
│   │   ├── integrations/                  # External API clients
│   │   ├── content/                       # AI content generators
│   │   ├── agents/                        # Specialized AI agents
│   │   ├── database/                      # SQLite persistence layer
│   │   ├── learning/                      # Brand voice learning system
│   │   ├── visual/                        # Image generation
│   │   ├── cli/                           # CLI commands
│   │   └── scripts/                       # Utility scripts
│   ├── dashboard/                         # Next.js dashboard UI
│   ├── mcp-server/                        # MCP server for Claude integration
│   └── package.json
│
├── kynesys-node/                          # Demos Network node software
│   ├── src/
│   │   ├── index.ts                       # Entry point, initialization
│   │   ├── client/                        # RPC client implementation
│   │   ├── features/                      # Feature modules
│   │   │   ├── multichain/                # Cross-chain operations
│   │   │   ├── mcp/                       # MCP server
│   │   │   ├── activitypub/               # Fediverse protocol
│   │   │   └── ... (other features)
│   │   ├── libs/                          # Core libraries
│   │   │   ├── blockchain/                # Chain abstraction
│   │   │   ├── peer/                      # P2P networking
│   │   │   ├── abstraction/               # Web2 integrations
│   │   │   └── ... (utilities)
│   │   ├── model/                         # Data models
│   │   ├── types/                         # TypeScript definitions
│   │   └── utilities/                     # Helpers
│   └── package.json
│
├── simple-prediction-app/                 # Prediction/betting UI
│   ├── src/
│   │   ├── main.tsx                       # Vite entry point
│   │   ├── App.tsx                        # Root component
│   │   ├── components/                    # React components
│   │   ├── services/                      # API clients (ApiService, etc.)
│   │   ├── stores/                        # Zustand stores (wallet, notifications)
│   │   ├── hooks/                         # Custom React hooks
│   │   ├── lib/                           # Utilities (crypto, formatting)
│   │   ├── utils/                         # Helper functions
│   │   └── styles/                        # CSS/Tailwind styles
│   └── package.json
│
├── dwarf-fortress-nft-game/               # NFT gaming platform
│   ├── SpaceFort/
│   │   ├── game-server.js                 # Main game server entry
│   │   ├── agent/                         # Agent gateway system
│   │   │   ├── gateway.js                 # Gateway server (port 5002)
│   │   │   ├── auth.js                    # Challenge-response auth
│   │   │   ├── protocol.js                # Agent protocol
│   │   │   ├── identity.js                # Identity management
│   │   │   └── sdk/                       # Agent SDK
│   │   ├── database/                      # Game state persistence
│   │   ├── contracts/                     # Smart contracts
│   │   ├── coop/                          # Cooperative features
│   │   └── events/                        # Event system
│   └── package.json
│
├── ralph-gui/                             # Claude loop management UI
│   ├── src/
│   │   ├── app/                           # Next.js app directory
│   │   │   ├── page.tsx                   # Home/project list
│   │   │   ├── new/page.tsx               # New project creation
│   │   │   ├── import/page.tsx            # Project import
│   │   │   ├── project/[name]/            # Project pages
│   │   │   │   ├── page.tsx               # Project overview
│   │   │   │   ├── monitor/page.tsx       # Iteration monitoring
│   │   │   │   ├── chain/page.tsx         # Decision chain view
│   │   │   │   └── results/page.tsx       # Results/output files
│   │   │   ├── api/                       # Next.js API routes
│   │   │   │   └── projects/              # Project API endpoints
│   │   │   └── layout.tsx                 # Root layout
│   │   ├── components/                    # React components
│   │   └── lib/                           # Utilities (ralph.ts for CLI integration)
│   └── package.json
│
├── omnifomo/                              # SocialFi betting platform
│   ├── agent-a-oracle/                    # Oracle agent service
│   ├── agent-b-settle/                    # Settlement agent service
│   ├── core-planner/                      # Core planning service
│   └── shared-lib/                        # Shared utilities
│
├── demos-faucet-automation/               # Wallet creation automation
│   ├── src/
│   │   ├── ... (CLI tool structure)
│   └── package.json
│
├── .planning/
│   ├── codebase/                          # GSD-generated codebase analysis
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   ├── CONVENTIONS.md
│   │   ├── TESTING.md
│   │   ├── STACK.md
│   │   ├── INTEGRATIONS.md
│   │   └── CONCERNS.md
│   └── ... (phase planning docs)
│
└── .claude/                               # Global Claude Code config
    ├── CLAUDE.md                          # User instructions
    ├── PRINCIPLES.md                      # Engineering principles
    ├── RULES.md                           # Behavioral rules
    └── projects/                          # Per-project config
```

## Directory Purposes

**demos-marketing-intelligence:**
- Purpose: AI-powered content automation for Demos Network marketing
- Contains: Pipeline orchestrator, AI content generation, Twitter monitoring, brand learning
- Key files: `src/workflows/content-pipeline.ts`, `dashboard/app/`, `mcp-server/`

**kynesys-node:**
- Purpose: Demos Network node software (core protocol implementation)
- Contains: Blockchain abstraction, P2P networking, RPC server, multi-chain execution
- Key files: `src/index.ts` (entry), `src/features/` (modular features)

**simple-prediction-app:**
- Purpose: Prediction/betting frontend application
- Contains: Market UI, wallet integration, WebSocket updates
- Key files: `src/main.tsx`, `src/services/ApiService.ts`

**dwarf-fortress-nft-game/SpaceFort:**
- Purpose: NFT-based game with blockchain integration
- Contains: Game server, agent gateway, smart contracts
- Key files: `game-server.js`, `agent/gateway.js`

**ralph-gui:**
- Purpose: Web UI for managing autonomous Claude loops
- Contains: Project management, iteration monitoring, output viewing
- Key files: `src/app/page.tsx`, `src/lib/ralph.ts`

**omnifomo:**
- Purpose: SocialFi multi-agent betting platform
- Contains: Oracle agent, settlement agent, shared utilities
- Key files: Each agent in its own subdirectory

**ares, demos-receipt-viewer, demos-faucet-automation, tlsnotary-demosdk-app:**
- Purpose: Various Demos SDK integration demos
- Contains: Standalone applications showcasing specific features

## Key File Locations

**Entry Points:**
- `demos-marketing-intelligence/src/workflows/content-pipeline.ts`: Pipeline entry (invoked by npm run pipeline)
- `kynesys-node/src/index.ts`: Node software entry
- `simple-prediction-app/src/main.tsx`: Frontend Vite entry
- `ralph-gui/src/app/page.tsx`: Ralph UI home page
- `dwarf-fortress-nft-game/SpaceFort/game-server.js`: Game server entry

**Configuration:**
- `*/package.json`: Project metadata and dependencies
- `*/tsconfig.json`: TypeScript configuration (projects with TS)
- `.planning/codebase/`: GSD codebase documentation
- `.claude/CLAUDE.md`: User-specific instructions

**Core Logic:**
- `demos-marketing-intelligence/src/workflows/`: Pipeline orchestration
- `kynesys-node/src/libs/blockchain/`: Blockchain abstraction
- `kynesys-node/src/features/`: Modular feature implementations
- `simple-prediction-app/src/services/`: API communication
- `ralph-gui/src/lib/ralph.ts`: Claude CLI integration

**Testing:**
- `*/tests/`, `*/__tests__/`: Jest/Vitest test files
- `*/*.test.ts`, `*/*.spec.ts`: Co-located tests
- Some projects: `scripts/test-*.ts` for integration tests

## Naming Conventions

**Files:**
- TypeScript source: `camelCase.ts` (services, utilities, components)
- React components: `PascalCase.tsx` (e.g., `MarketCard.tsx`, `WalletModal.tsx`)
- Tests: `*.test.ts`, `*.spec.ts` or separate `/tests` directory
- Configurations: lowercase with dots (`.eslintrc.json`, `tsconfig.json`)
- Entry points: `index.ts`, `main.tsx`, `server.ts`, `page.tsx`

**Directories:**
- Feature modules: `camelCase/` (e.g., `multichain/`, `integrations/`, `content/`)
- API/server routes: `route.ts` within directory structure (Next.js convention)
- Utility dirs: `lib/`, `utils/`, `utilities/` (synonymous—use project convention)
- Component dirs: `components/`, always PascalCase files inside

**Classes/Types:**
- Classes: `PascalCase` (e.g., `ContentPipeline`, `TypefullyClient`, `AIContentGenerator`)
- Interfaces: `PascalCase` with prefix `I` optional (e.g., `PipelineConfig`, `Market`)
- Enums: `PascalCase` (e.g., `SourceType`)
- Type aliases: `camelCase` or `PascalCase` depending on context

**Functions:**
- Named exports: `camelCase` (e.g., `formatBalance`, `getDatabase`)
- Hooks: `useXxx` convention (e.g., `useWebSocket`, `useWallet`)
- Static utility functions: `camelCase` on modules

## Where to Add New Code

**New Feature (Complex):**
- Primary code: Create new directory under `src/workflows/` or `src/features/` (kynesys-node)
- Tests: `tests/` or co-located `.test.ts`
- Example: Adding new content type → `demos-marketing-intelligence/src/workflows/new-workflow.ts`

**New Component/Module (React):**
- Implementation: `src/components/YourComponent.tsx`
- Hooks: `src/hooks/useYourHook.ts`
- Tests: `src/components/__tests__/YourComponent.test.tsx`
- Styles: Co-located or in `src/styles/`
- Example: `ralph-gui/src/components/NewWidget.tsx`

**New Service/Integration:**
- Implementation: `src/services/YourService.ts` or `src/integrations/YourAPI.ts`
- Types: Define interfaces at top of file or in shared `src/types/`
- Example: `demos-marketing-intelligence/src/integrations/newApi.ts`

**Utilities:**
- Shared helpers: `src/lib/yourHelper.ts` (smaller, focused)
- Larger utilities: `src/utilities/yourModule.ts`
- Cross-project: Consider `shared-lib/` if used by multiple projects

**Database/Models:**
- Schema: `src/database/schema.ts` or migrations directory
- Queries: `src/database/queries.ts` or method on database class
- Types: `src/database/types.ts` or inline interfaces

## Special Directories

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No (in .gitignore)

**dist/, build/, .next/:**
- Purpose: Build output
- Generated: Yes
- Committed: No

**data/, generated-images/:**
- Purpose: Runtime-generated files (DBs, images, artifacts)
- Generated: Yes (during runtime)
- Committed: No (store in .gitignore)

**.claude/, .serena/, .planning/:**
- Purpose: Configuration and documentation
- Generated: Partially (GSD-generated docs)
- Committed: Yes (.planning/ after GSD generation)

**agent/, coop/, contracts/:**
- Purpose: SpaceFort game subsystems
- Generated: No
- Committed: Yes

## File Organization Principles

**Single Responsibility:** Each file has one primary purpose
- Service files: Single API client or business logic unit
- Component files: Single React component
- Utility files: Related utilities (e.g., all string helpers in one file, or separate by domain)

**Colocation:** Related code stays together
- Component + hooks + types in adjacent files
- Service + its tests in same directory
- Integrations grouped in `src/integrations/` by provider

**Layering:** Code flows downward
- Workflows depend on services, not vice versa
- Components depend on hooks and services, not vice versa
- Services don't depend on components

**Module Exports:** Prefer index.ts barrel files when grouping
- Examples: `src/content/index.ts` exports all generators
- Reduces import path verbosity
- Not enforced—use judgment
