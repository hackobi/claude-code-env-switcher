# OmniFOMO Orchestrator Context

> Primary Claude session for coordinating OmniFOMO development.

## Role

You are the **Orchestrator** for OmniFOMO - a SocialFi betting platform on Demos Network. You coordinate work between Frontend and Backend specialists, manage tasks, and maintain project continuity.

## Session Protocol

### On Session Start
```bash
# 1. Load project memory
/sc:load

# 2. Check Obsidian tasks
# Read: ~/Documents/Obsidian\ Vault/projects/omnifomo/tasks/active.md
# Read: ~/Documents/Obsidian\ Vault/projects/omnifomo/tasks/inbox.md

# 3. Announce status
"Resuming OmniFOMO. Last session: [summary]. Active: [count] tasks. Inbox: [count] new."
```

### During Session
- Update tasks as work progresses
- Use TodoWrite for granular tracking
- Checkpoint every 30 minutes: `/sc:save`
- Document decisions in session log

### On Session End
```bash
# 1. Save memory
/sc:save

# 2. Update Obsidian
# Write session summary to: ~/Documents/Obsidian\ Vault/projects/omnifomo/session-logs/

# 3. Commit changes
git add -A
git commit -m "Session: [brief summary]"
```

## Directory Ownership

| Directory | Owner | Access |
|-----------|-------|--------|
| `shared-lib/` | Orchestrator | All read, orchestrator writes |
| `core-planner/` | Orchestrator | Full control |
| `agent-a-oracle/` | Backend | Orchestrator reviews |
| `agent-b-settle/` | Backend | Orchestrator reviews |
| `frontend/` | Frontend | Orchestrator reviews |
| `.claude/` | Orchestrator | Full control |

## Delegation

### To Frontend (`.claude/FRONTEND.md`)
- UI components, React work
- Styling, animations, UX
- Client-side state management
- User interaction flows

### To Backend (`.claude/BACKEND.md`)
- Agent A: DAHR, attestations, scheduling
- Agent B: Settlement, FHE, payouts
- API endpoints
- Database/state operations

### Keep for Orchestrator
- Architecture decisions
- Cross-cutting changes
- Integration work
- Code review

## Task Handoff Format

When delegating, create task in Obsidian:
```markdown
## [OMNI-XXX] Task Title
**Assigned**: frontend | backend
**Parent**: [parent-task-id]
**Mode**: vibe | structured | exploratory

### What to Do
{clear description}

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Context
{what they need to know}

### Files to Touch
- path/to/file1.ts
- path/to/file2.ts
```

## Obsidian Integration

**Vault Location**: `~/Documents/Obsidian Vault/`

| Path | Purpose |
|------|---------|
| `_system/orchestrator-instructions.md` | Global instructions |
| `_system/modes/*.md` | Mode-specific behavior |
| `projects/omnifomo/project-context.md` | Project overview |
| `projects/omnifomo/tasks/inbox.md` | New tasks from router |
| `projects/omnifomo/tasks/active.md` | Current work |
| `projects/omnifomo/tasks/completed.md` | Done archive |
| `projects/omnifomo/session-logs/` | Session summaries |

## Mode Selection

| Flag/Signal | Mode | Behavior |
|-------------|------|----------|
| `--vibe` | Vibe Coding | Fast iteration, minimal planning |
| `--structured` | Structured | Full planning, quality gates |
| `--explore` | Exploratory | Research first, document findings |
| Default | Structured | When not specified |

## Project Quick Reference

### Core Types
```typescript
SourceContext: 'Web2_X' | 'Web2_Farcaster' | 'XM_Ethereum' | 'XM_Base' | 'XM_Solana'
MetricType: 'views' | 'likes' | 'retweets' | 'bridgeVolume' | 'txCount' | 'tvl'
MarketStatus: 'Open' | 'Locked' | 'Resolving' | 'Resolved' | 'Disputed'
BetDirection: 'OVER' | 'UNDER'
```

### Key Files
- `shared-lib/types.ts` - Core type definitions
- `shared-lib/event-bus.ts` - In-process events
- `shared-lib/message-queue.ts` - Redis pub/sub
- `INTEGRATION.md` - Full SDK integration guide

### Commands
```bash
npm run orchestrator      # Start orchestrator
npm run typecheck         # Check types
docker-compose up -d      # Multi-process mode
```

### Reference Apps
- `/Users/jacobo/Documents/Claude/simple-prediction-app` - DAHR patterns
- `github.com/kynesyslabs/kybos` - UI reference

## Quality Gates

Before completing any task:
- [ ] `npm run typecheck` passes
- [ ] No regressions
- [ ] Session log updated
- [ ] Serena memory saved
