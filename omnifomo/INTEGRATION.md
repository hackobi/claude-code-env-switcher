# OmniFOMO Integration Guide

> Cross-context SocialFi betting platform built on the Demos Network

## Quick Reference

| Resource | URL/Path |
|----------|----------|
| **Demos SDK Docs** | https://docs.kynesys.xyz |
| **SDK Installation** | https://docs.kynesys.xyz/sdk/getting-started |
| **Context7 Library** | `/websites/kynesyslabs_github_io_demosdk-api-ref` |
| **UI Reference (Kybos)** | https://github.com/kynesyslabs/kybos |
| **DAHR Oracle** | https://github.com/kynesyslabs/DemosSentinel |
| **MCP Server** | https://github.com/kynesyslabs/demosdk-mcp-server |

---

## 1. Demos SDK Setup

### Installation

```bash
bun add @kynesyslabs/demosdk@latest
```

### Vite Configuration (Browser)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
});
```

### Basic Connection

```typescript
import { demos } from '@kynesyslabs/demosdk/websdk';

// Connect to network
await demos.connect('https://node2.demos.sh');

// Connect wallet
await demos.connectWallet('your-mnemonic-phrase');

// Get address
const address = demos.getAddress();
```

---

## 2. Existing Repositories

### Primary Integration Sources

#### simple-prediction-app (Local)
**Path**: `/Users/jacobo/Documents/Claude/simple-prediction-app`

Production-ready betting app with DAHR integration.

**Key Files**:
- `server/src/services/DiceRollService.ts` - DAHR dice rolling with attestation
- `server/src/services/PayoutService.ts` - Payout distribution
- `server/src/services/WebSocketService.ts` - Real-time updates
- `src/stores/wallet.ts` - Wallet connection patterns
- `src/components/` - React UI components

**Reusable Patterns**:
```typescript
// DAHR Instance Creation
const dahrInstance = await demos.web2.createDahr();

// Web2 API Fetch with Attestation
const response = await dahrInstance.startProxy({
  url: 'https://api.example.com/data',
  method: 'GET',
  options: {
    headers: {},
    data: ''
  }
});
```

#### kybos (GitHub Reference)
**URL**: https://github.com/kynesyslabs/kybos

Decentralized dice prediction market - UI/UX reference.

**Stack**:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- State: Zustand
- Backend: Bun + Hono + SQLite
- Real-time: WebSocket

**Design System**:
- Dark theme with purple/cyan accents
- Glass morphism effects
- Fira Code / Inter fonts
- Responsive mobile-first

#### DemosSentinel (GitHub)
**URL**: https://github.com/kynesyslabs/DemosSentinel

Production DAHR oracle for Web2 → Smart Contract attestations.

**Use for Agent A**:
- Web2 API data fetching
- TLS session attestation
- EVM/Solana delivery

#### demos-faucet-automation (Local)
**Path**: `/Users/jacobo/Documents/Claude/demos-faucet-automation`

Wallet management and token operations.

**Key Files**:
- `src/wallet-generator.js` - Mnemonic generation
- `src/faucet-requester.js` - Token requests
- SDK connection patterns

---

## 3. KynesysLabs Repository Map

### Core SDK & Documentation
| Repo | Purpose |
|------|---------|
| `sdks` | All DEMOS SDKs |
| `demosdk-api-ref` | SDK API reference docs |
| `demosdk-mcp-server` | MCP server for AI documentation access |
| `documentation` | Main docs (Mintlify) |
| `demos_docs` | mdbook version |
| `demos_yellowpaper` | Technical vision document |

### Infrastructure
| Repo | Purpose |
|------|---------|
| `node` | Demos Node implementation |
| `nodes-dashboard` | Network status dashboard |
| `zk_ceremony` | ZK ceremony key generation |

### Applications
| Repo | Purpose |
|------|---------|
| `kybos` | Dice prediction market (reference) |
| `demos-faucet` | Testnet faucet |

### Contracts & Integration
| Repo | Purpose |
|------|---------|
| `aptos_integration_contract` | Move contracts for Aptos |

### Branding
| Repo | Purpose |
|------|---------|
| `demos_branding_kit` | Brand guidelines and assets |

---

## 4. DAHR (Data Agnostic HTTPS Relay)

### Overview
DAHR enables trustless Web2 data fetching with network attestation.

### Creating a DAHR Instance

```typescript
import { demos } from '@kynesyslabs/demosdk/websdk';

// Create DAHR instance
const dahr = await demos.web2.createDahr();

// Fetch Web2 data with attestation
const result = await dahr.startProxy({
  url: 'https://api.twitter.com/2/tweets/12345',
  method: 'GET',
  options: {
    headers: {
      'Authorization': 'Bearer TOKEN'
    },
    data: ''
  }
});

// Result contains:
// - response.status
// - response.data (API response)
// - attestation proof (TLS session)
```

### Attestation Flow for OmniFOMO

```
1. User creates market targeting X post views
2. Agent A schedules DAHR fetch at deadline
3. DAHR fetches X API → TLS attestation
4. Attestation submitted to GCR
5. Agent B resolves market based on attested value
```

---

## 5. Cross-Chain (XM Scripting)

### Supported Chains
- EVM (Ethereum, Base, Arbitrum, Polygon)
- Solana
- MultiversX
- IBC networks
- Bitcoin, TON, XRPL, NEAR, Sui, Aptos

### XM Transaction Pattern

```typescript
import {
  prepareXMPayload,
  prepareXMScript
} from "@kynesyslabs/demosdk/websdk"
import { EVM } from "@kynesyslabs/demosdk/xm-websdk"

// 1. Create chain-specific payload
const evm = await EVM.create("https://rpc.ankr.com/eth_sepolia")
await evm.connectWallet("private_key")
const evmTx = await evm.preparePay("0xRecipient", "0.001")

// 2. Create XMScript
const xmscript = prepareXMScript({
  chain: "eth",
  subchain: "sepolia",
  signedPayloads: [evmTx],
  type: "pay"
})

// 3. Convert to Demos transaction
const tx = await prepareXMPayload(xmscript, demos)

// 4. Broadcast
const validityData = await demos.confirm(tx)
const result = await demos.broadcast(validityData)
```

---

## 6. Global Change Registry (GCR)

### Purpose
Shared state registry for blockchain scalability - tracks account and subnet properties without storing redundant state in every block.

### OmniFOMO GCR Schema

```json
{
  "MomentMarket": {
    "id": "bytes32",
    "sourceContext": "Web2_X | XM_Base | ...",
    "targetMetric": { "type": "views", "sourceId": "tweet_123" },
    "threshold": "uint256",
    "deadline": "uint64",
    "status": "Open | Resolved",
    "poolState": {
      "totalOverStake": "uint256 (FHE)",
      "totalUnderStake": "uint256 (FHE)"
    }
  },
  "UserPosition": {
    "userId": "address",
    "marketId": "bytes32",
    "stakeAmount": "uint256 (FHE)",
    "direction": "OVER | UNDER",
    "sourceChain": "Ethereum | Base | Solana"
  }
}
```

---

## 7. Web2 Identity Integration

### Supported Platforms
- GitHub
- Discord
- Twitter/X
- Telegram

### Identity Verification Pattern

```typescript
import { demos } from '@kynesyslabs/demosdk/websdk';

// Infer Web2 identity from proof
const identityResult = await demos.abstraction.inferWeb2Identity({
  demos,
  payload: {
    proof: "oauth_proof_string",
    metadata: { username: "user123" }
  }
});

// Get user's Web2 identities
const identities = await demos.abstraction.getWeb2Identities({
  demos,
  address: "0x123..."
});
```

---

## 8. MCP Server Integration

### Install Demos SDK MCP Server

```bash
# Clone the MCP server
git clone https://github.com/kynesyslabs/demosdk-mcp-server
cd demosdk-mcp-server

# Install and configure
chmod +x install.sh
./install.sh

# Add to Claude Code
claude mcp add demos-sdk-docs
```

### Available MCP Tools
- `demos_network_sdk_search_content` - Search documentation
- `demos_network_sdk_get_page` - Get specific page
- `demos_network_sdk_list_sections` - Table of contents
- `demos_network_sdk_get_code_blocks` - Extract code examples
- `demos_network_sdk_get_markdown` - Get page as markdown

### Context7 Usage

```typescript
// Use Context7 library ID for SDK docs
libraryId: "/websites/kynesyslabs_github_io_demosdk-api-ref"

// Query example
query: "How to create DAHR instance for Web2 API calls"
```

---

## 9. Agent Architecture

### Agent A: Oracle/Web2 Specialist
**Location**: `/omnifomo/agent-a-oracle/`

**Responsibilities**:
- DAHR proxy setup for X/Farcaster APIs
- Attestation engine for Web2 data proofs
- TLS session certification
- GCR intent submission

**Key Imports**:
```typescript
import { demos } from '@kynesyslabs/demosdk/websdk';
// Reference: simple-prediction-app/server/src/services/DiceRollService.ts
```

### Agent B: Settlement/Privacy Specialist
**Location**: `/omnifomo/agent-b-settle/`

**Responsibilities**:
- XM scripting for cross-chain bets
- FHE encryption until resolution
- Gas Tank abstraction (multi-token → USDC)
- Position settlement

**Key Imports**:
```typescript
import { prepareXMPayload, prepareXMScript } from "@kynesyslabs/demosdk/websdk"
import { EVM } from "@kynesyslabs/demosdk/xm-websdk"
```

---

## 10. Development Workflow

### Local Development

```bash
# Install dependencies
cd omnifomo
bun install

# Run planner simulation
bun run planner

# Start with live SDK
DEMOS_RPC_URL=https://node2.demos.sh bun run dev
```

### Environment Variables

```bash
# .env
DEMOS_RPC_URL=https://node2.demos.sh
SERVER_MNEMONIC="your-twelve-word-mnemonic"
FAUCET_BACKEND_URL=https://faucetbackend.demos.sh
```

### Testing with Faucet

```bash
# Use demos-faucet-automation for test tokens
cd /Users/jacobo/Documents/Claude/demos-faucet-automation
node src/cli.js auto --count 5
```

---

## 11. UI/Design Guidelines

### From Kybos Reference

**Colors**:
- Background: `gray-950` (#030712)
- Primary: Purple/Cyan gradient
- Glass effects: `bg-white/5 backdrop-blur-xl`

**Typography**:
- Headlines: Neue Machina / Inter Bold
- Body: Inter Regular
- Code: Fira Code

**Components**:
- Glass morphism cards
- Animated transitions (`animate-in`)
- Real-time WebSocket indicators
- Confetti celebrations for wins

**Fonts Location**:
```
/simple-prediction-app/public/fonts/
├── Fira_Code/
├── Inter/
├── NeueMachina-*.otf
└── Source_Code_Pro/
```

---

## 12. File Reference Map

```
/omnifomo
├── INTEGRATION.md          # This file
├── schema.demos.json       # GCR schema
├── package.json
├── core-planner/
│   └── planner.ts          # Bet lifecycle orchestration
├── agent-a-oracle/
│   ├── dahr-service.ts     # DAHR Web2 fetching
│   └── attestation.ts      # Proof generation
├── agent-b-settle/
│   ├── xm-service.ts       # Cross-chain settlement
│   ├── fhe-module.ts       # Encryption
│   └── gas-tank.ts         # Token abstraction
└── shared-lib/
    ├── types.ts            # TypeScript types
    ├── demos-client.ts     # SDK wrapper
    ├── gcr-client.ts       # GCR operations
    └── dahr-client.ts      # DAHR helper

/simple-prediction-app      # Reference implementation
├── server/src/services/    # Backend services
└── src/                    # Frontend React app

/demos-faucet-automation    # Wallet & token tools
└── src/                    # CLI utilities
```

---

## 13. Quick Commands

```bash
# Context7 SDK lookup
mcp__context7__query-docs libraryId="/websites/kynesyslabs_github_io_demosdk-api-ref" query="DAHR Web2 proxy"

# Check SDK docs
open https://docs.kynesys.xyz/sdk/web2-integration

# Run prediction app locally
cd /Users/jacobo/Documents/Claude/simple-prediction-app
docker-compose up --build
```
