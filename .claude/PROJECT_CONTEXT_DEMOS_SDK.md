# Demos SDK Project Context

## Overview
Loaded project context for three applications using @kynesyslabs/demosdk for blockchain integration with the Demos Network.

## Projects Using Demos SDK

### 1. Orbit Runner (`orbit-runner/`)
- **Purpose**: 3D space-flight game with optional multiplayer and blockchain features
- **SDK Version**: @kynesyslabs/demosdk@2.4.16
- **Integration**: Wallet integration for payments and data storage
- **Key Features**:
  - Pay-to-play mechanics (1 DEM)
  - Leaderboard data storage on blockchain via DAHR
  - Jackpot payouts for high scores
  - Treasury wallet management
  - Extension detection system

### 2. Simple Prediction App (`simple-prediction-app/`)
- **Purpose**: Dice prediction markets dApp with real-time betting
- **SDK Version**: @kynesyslabs/demosdk@latest
- **Integration**: DAHR service for verifiable randomness
- **Key Features**:
  - Real-time dice rolling via DAHR attestation
  - Multiple betting markets (High/Low, Even/Odd, Range)
  - Signature-based betting with wallet integration
  - WebSocket real-time updates

### 3. Dwarf Fortress NFT Game (`dwarf-fortress-nft-game/SpaceFort/`)
- **Purpose**: Gaming application with NFT integration
- **SDK Version**: @kynesyslabs/demosdk@2.2.35
- **Integration**: Blockchain service for NFT and token operations

## SDK Usage Patterns

### Common Imports
```typescript
// Browser/Frontend usage
import { demos } from '@kynesyslabs/demosdk/websdk';

// Node.js/Backend usage  
const { Demos } = require('@kynesyslabs/demosdk/websdk');
```

### Core SDK Features Used

#### 1. Wallet Connection
```typescript
// Connect to network
await demos.connect("https://node2.demos.sh");

// Connect wallet with mnemonic
await demos.connectWallet(mnemonic);

// Get addresses
const address = demos.getAddress();
const ed25519Address = await demos.getEd25519Address();
```

#### 2. Balance Operations
```typescript
// Get balance
const addressInfo = await demos.getAddressInfo(ed25519Address);
const balance = addressInfo?.balance;
```

#### 3. DAHR (Data Agnostic HTTPS Relay) Service
```typescript
// Create DAHR proxy for attested HTTP requests
const dahrProxy = await demos.web2.createDahr();

// Make attested request
const response = await dahrProxy.startProxy({
  url: 'https://api.example.com/data',
  method: 'GET',
  options: { headers: {...} }
});
```

#### 4. Native Transfers
```typescript
// Transfer tokens
await demos.nativeTransfer(recipientAddress, amount);
```

### Environment Configuration

#### Required Environment Variables
- `DEMOS_SERVER_MNEMONIC`: Server wallet mnemonic for backend operations
- `DEMOS_TREASURY_MNEMONIC`: Treasury wallet for payments (Orbit Runner)
- `DEMOS_RPC_URL`: RPC endpoint (default: https://node2.demos.sh)
- `TREASURY_MIN_RESERVE`: Minimum treasury balance
- `PAYOUT_MIN_PRIZE`: Minimum payout amount

#### Network Configuration
- **Primary RPC**: https://node2.demos.sh
- **Alternative RPCs**: 
  - https://demosnode.discus.sh
  - http://mungaist.com:53550

## Architecture Patterns

### 1. Wallet State Management (Zustand Store)
- Secure mnemonic encryption with user passwords
- Session-based wallet persistence
- Automatic connection restoration
- Balance monitoring and refresh

### 2. Extension Detection System
- Multiple event listeners for wallet extension announcement
- Fallback detection mechanisms
- Provider validation and sanitization
- Safe request wrapper functions

### 3. Server-Side Operations
- Separate server and treasury wallet instances
- Transaction verification across multiple RPC endpoints
- Gas fee management by server
- Jackpot payout automation

### 4. DAHR Integration
- Singleton service pattern for DAHR operations
- Standardized response handling
- Error recovery and retry mechanisms
- Multi-API testing capabilities

## Key Technical Details

### Security Considerations
- Client never directly broadcasts transactions
- Server pays gas fees and handles broadcasting
- Treasury safety with minimum reserve requirements
- Encrypted mnemonic storage with user passwords

### Payment Flow (Orbit Runner)
1. Client connects wallet and pays 1 DEM to treasury
2. Server verifies payment across multiple RPC nodes
3. Server issues session token for gameplay
4. Game statistics signed and submitted to blockchain
5. Server handles gas and broadcasting

### DAHR Attestation Flow
1. Create DAHR proxy session
2. Submit HTTP request through proxy
3. Receive attested response with signatures
4. Verify attestation validity
5. Use verified data in application logic

## Version Differences
- **2.2.35**: Earlier version used in NFT game
- **2.4.16**: Current stable version in Orbit Runner  
- **latest**: Bleeding edge version in prediction app

## Development Setup
- All projects include Docker Compose configurations
- Local development uses http://localhost:* endpoints
- Production requires proper SSL/TLS configuration
- Environment variables must be configured before starting

## Integration Quality
- ✅ Comprehensive error handling and logging
- ✅ Session management and persistence
- ✅ Multi-environment configuration support
- ✅ Security best practices implementation
- ✅ Real-world production usage patterns