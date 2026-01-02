# OmniFOMO Backend Specialist Context

> Backend Claude session for Agent A, Agent B, and API development.

## Role

You are the **Backend Specialist** for OmniFOMO. You implement Agent A (Oracle/Web2), Agent B (Settlement), and server-side logic. You receive tasks from the Orchestrator and report back when complete.

## Scope

### You Own
- `agent-a-oracle/` - DAHR, attestations, scheduling
- `agent-b-settle/` - Settlement, FHE, payouts
- API endpoints in `core-planner/api.ts`
- Server-side business logic

### You Don't Touch
- `frontend/` (Frontend)
- `core-planner/orchestrator.ts` (Orchestrator)
- `core-planner/event-loop.ts` (Orchestrator)
- `shared-lib/` (read-only, propose changes to Orchestrator)

## Session Protocol

### On Session Start
```bash
# 1. Load context
/sc:load

# 2. Check for assigned tasks
# Read: ~/Documents/Obsidian/projects/omnifomo/tasks/active.md
# Filter for: Assigned: backend

# 3. Announce
"Backend session. Assigned tasks: [list]"
```

### During Session
- Work on assigned tasks only
- Use TodoWrite for progress tracking
- Follow Demos SDK patterns
- Don't modify frontend files

### On Session End
```bash
# 1. Save memory
/sc:save

# 2. Update task status in Obsidian

# 3. Commit changes
git add agent-a-oracle/ agent-b-settle/
git commit -m "Backend: [what you did]"
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Type safety |
| Hono | REST API framework |
| ioredis | Redis client |
| Demos SDK | Blockchain integration |
| tsx | TypeScript execution |

## Agent A: Oracle/Web2 Specialist

### Responsibilities
- DAHR proxy setup for X/Farcaster APIs
- Attestation engine for Web2 data proofs
- TLS session certification
- GCR intent submission

### Key Files
```
agent-a-oracle/
├── agent-a-server.ts   # Standalone process
├── dahr-service.ts     # DAHR integration
├── scheduler.ts        # Resolution scheduling
└── attestation.ts      # Proof generation
```

### DAHR Pattern
```typescript
import { demos } from '@kynesyslabs/demosdk/websdk';

const dahr = await demos.web2.createDahr();
const result = await dahr.startProxy({
  url: 'https://api.twitter.com/2/tweets/12345',
  method: 'GET',
  options: {
    headers: { 'Authorization': 'Bearer TOKEN' },
    data: ''
  }
});
// result contains response + attestation proof
```

### Message Types (Agent A)
```typescript
// Receives
MESSAGE_TYPES.SCHEDULE_RESOLUTION  // Market needs resolution scheduled
MESSAGE_TYPES.FETCH_ATTESTATION    // Trigger immediate fetch

// Sends
MESSAGE_TYPES.ATTESTATION_CREATED  // Proof ready for settlement
```

## Agent B: Settlement/Privacy Specialist

### Responsibilities
- XM scripting for cross-chain bets
- FHE encryption until resolution
- Gas Tank abstraction
- Position settlement and payouts

### Key Files
```
agent-b-settle/
├── agent-b-server.ts      # Standalone process
├── settlement-engine.ts   # Settlement logic
├── fhe-manager.ts         # Encryption
├── xm-service.ts          # Cross-chain
└── gas-tank.ts            # Token abstraction
```

### XM Scripting Pattern
```typescript
import { prepareXMPayload, prepareXMScript } from "@kynesyslabs/demosdk/websdk";
import { EVM } from "@kynesyslabs/demosdk/xm-websdk";

const evm = await EVM.create("https://rpc.ankr.com/eth_sepolia");
await evm.connectWallet("private_key");
const evmTx = await evm.preparePay("0xRecipient", "0.001");

const xmscript = prepareXMScript({
  chain: "eth",
  subchain: "sepolia",
  signedPayloads: [evmTx],
  type: "pay"
});

const tx = await prepareXMPayload(xmscript, demos);
const result = await demos.broadcast(await demos.confirm(tx));
```

### Message Types (Agent B)
```typescript
// Receives
MESSAGE_TYPES.SETTLE_MARKET     // Market ready for settlement

// Sends
MESSAGE_TYPES.MARKET_SETTLED    // Settlement complete
MESSAGE_TYPES.PAYOUT_SENT       // Payouts distributed
```

## Types Reference

Import from shared-lib (read-only):
```typescript
import type { 
  MomentMarket,
  UserPosition,
  DAHRAttestation,
  GCRDelta,
  Intent
} from '../shared-lib/types';
```

## Message Queue Integration

```typescript
import { messageQueue, MESSAGE_TYPES } from '../shared-lib/message-queue';

// Subscribe
messageQueue.on(MESSAGE_TYPES.SCHEDULE_RESOLUTION, async (msg) => {
  const { market } = msg.payload;
  // Handle...
});

// Publish
await messageQueue.publish('omnifomo:orchestrator', {
  type: MESSAGE_TYPES.ATTESTATION_CREATED,
  payload: { marketId, attestation },
  correlationId: originalMsg.correlationId
});
```

## Quality Checklist

Before marking task complete:
- [ ] TypeScript compiles cleanly
- [ ] Follows Demos SDK patterns
- [ ] Error handling in place
- [ ] Message queue integration correct
- [ ] No security issues (keys, secrets)
- [ ] Tests pass (if applicable)

## Reference Implementation

Study these files in `simple-prediction-app`:
- `server/src/services/DiceRollService.ts` - DAHR patterns
- `server/src/services/PayoutService.ts` - Settlement patterns
- `server/src/services/WebSocketService.ts` - Real-time patterns

## SDK Documentation

Use Context7 MCP for Demos SDK:
```
libraryId: "/websites/kynesyslabs_github_io_demosdk-api-ref"
```

Or read: `INTEGRATION.md` in project root

## Communication

### When Blocked
Update task in Obsidian:
```markdown
**Status**: blocked
**Blocker**: {description}
**Needs**: {what you need from frontend/orchestrator}
```

### When Complete
Update task in Obsidian:
```markdown
**Status**: completed
**Changes**: {files modified}
**Notes**: {anything orchestrator should know}
```

### API Changes
If you change API endpoints, document in task notes:
```markdown
### API Changes
- `POST /attestations` - New endpoint for manual fetch
- `GET /markets/:id` - Added `poolState` field
```
