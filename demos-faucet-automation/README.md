# Demos Faucet Automation Tool

Automated wallet creation, faucet funding, and token transfer system for the Demos Network.

## Features

- **Wallet Generation**: Create new Demos wallets with secure mnemonic generation
- **Automatic Faucet Requests**: Request test tokens from https://faucet.demos.sh/
- **Batch Operations**: Create multiple wallets, fund via faucet, and transfer tokens
- **Token Transfers**: Send DEM tokens using the correct SDK sequence
- **Balance Checking**: Verify wallet balances across multiple wallets

## Installation

```bash
npm install
```

## Quick Start

### Interactive Mode
```bash
npm start
# or
node src/cli.js interactive
```

### Create Wallets and Request Tokens
```bash
node src/cli.js auto --count 5
```

## Project Structure

```
├── src/                    # Core modules
│   ├── cli.js              # Command-line interface
│   ├── wallet-generator.js # Wallet creation utilities
│   ├── faucet-requester.js # Faucet API integration
│   └── transfer.js         # Token transfer utilities
├── scripts/                # Utility scripts
│   ├── batch-create-fund-transfer.js  # Full automation pipeline
│   ├── transfer-to-target.js          # Transfer tokens to target address
│   ├── sweep-all.js                   # Sweep remaining balances
│   ├── check-balances.js              # Check wallet balances
│   └── check-old-wallets.js           # Check archived wallets
├── batch-wallets/          # Generated wallet files
├── archive/                # Old experimental scripts and docs
└── package.json
```

## Command Reference

### Wallet Commands

```bash
# Create a single wallet
node src/cli.js wallet create

# Create multiple wallets
node src/cli.js wallet create-multiple --count 10

# Load existing wallet from file
node src/cli.js wallet load wallet-file.json
```

### Faucet Commands

```bash
# Check faucet status
node src/cli.js faucet status

# Request tokens for specific address
node src/cli.js faucet request 0x1234567890abcdef...

# Request tokens for all wallet files
node src/cli.js faucet request-from-files
```

### Transfer Scripts

```bash
# Full pipeline: create wallets, fund, transfer to target
node scripts/batch-create-fund-transfer.js

# Transfer from existing wallets to target
node scripts/transfer-to-target.js

# Sweep all remaining balances to target
node scripts/sweep-all.js

# Check balances of all wallets
node scripts/check-balances.js
```

## SDK Transfer Method

The correct sequence for transferring DEM tokens:

```javascript
import { demos } from '@kynesyslabs/demosdk/websdk';

// Connect to network and wallet
await demos.connect('https://node2.demos.sh');
await demos.connectWallet(mnemonic);

// Three-step transfer process
const signedTransaction = await demos.transfer(targetAddress, amount);
const validationData = await demos.confirm(signedTransaction);
const result = await demos.broadcast(validationData);
```

**Important**: All three steps (transfer → confirm → broadcast) are required for tokens to actually move.

## Configuration

Edit the target address in scripts as needed:

```javascript
const TARGET_ADDRESS = '0x...your-target-address';
```

### Environment Variables (Optional)

```bash
DEMOS_RPC_URL=https://node2.demos.sh
FAUCET_BACKEND_URL=https://faucetbackend.demos.sh
```

## Wallet Files

Generated wallets are saved as JSON:

```json
{
  "created": "2024-01-01T12:00:00.000Z",
  "mnemonic": "abandon ability able about above...",
  "address": "0x1234567890abcdef...",
  "ed25519Address": "0xabcdef1234567890..."
}
```

## Security Notes

- Mnemonics are saved in plain text - keep wallet files secure
- Delete wallet files after use if not needed
- This is for testnet only - don't use for mainnet funds

## Network Details

- **Node**: `https://node2.demos.sh`
- **Faucet**: `https://faucet.demos.sh/`
- **Token**: DEM (Demos native token)
- **SDK**: `@kynesyslabs/demosdk`

## Dependencies

- `@kynesyslabs/demosdk` - Demos Network SDK
- `axios` - HTTP client
- `chalk` - Terminal styling
- `commander` - CLI framework
- `inquirer` - Interactive prompts

## License

MIT
