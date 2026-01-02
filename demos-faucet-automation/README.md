# Demos Faucet Automation Tool

Automated wallet creation and faucet request system for the Demos Network. This tool helps you create wallets and automatically request test tokens from the Demos faucet.

## Features

- 🔐 **Wallet Generation**: Create new Demos wallets with secure mnemonic generation
- 💰 **Automatic Faucet Requests**: Request test tokens from https://faucet.demos.sh/
- 🤖 **Full Automation**: Create multiple wallets and request tokens automatically
- 📱 **Interactive CLI**: User-friendly command-line interface
- 💾 **Wallet Management**: Save/load wallet information securely
- 🔄 **Batch Operations**: Handle multiple wallets efficiently
- 📊 **Status Monitoring**: Check faucet status and transaction details

## Installation

```bash
# Clone or create the project
cd demos-faucet-automation

# Install dependencies
npm install

# Make CLI executable (optional)
npm link
```

## Quick Start

### Interactive Mode (Recommended)
```bash
# Start interactive mode with guided prompts
npm start
# or
node src/cli.js interactive
```

### Automated Workflow
```bash
# Create 5 wallets and request tokens automatically
node src/cli.js auto --count 5

# Create wallets only (skip faucet requests)
node src/cli.js auto --count 3 --skip-faucet
```

## Command Reference

### Wallet Commands

```bash
# Create a single wallet
node src/cli.js wallet create

# Create with specific mnemonic
node src/cli.js wallet create --mnemonic "your twelve word mnemonic phrase here"

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

# Request tokens for multiple addresses
node src/cli.js faucet request-multiple 0x123... 0x456... 0x789...

# Request tokens for all wallet files
node src/cli.js faucet request-from-files

# Check transaction status
node src/cli.js faucet check-tx <transaction-hash>
```

### Direct Script Usage

```bash
# Wallet generator only
node src/wallet-generator.js
node src/wallet-generator.js --count 5
node src/wallet-generator.js --mnemonic "your mnemonic here"

# Faucet requester only  
node src/faucet-requester.js --status
node src/faucet-requester.js --address 0x123...
node src/faucet-requester.js --files
```

## API Usage

### Wallet Generator

```javascript
import DemosWalletGenerator from './src/wallet-generator.js';

const generator = new DemosWalletGenerator();

// Create single wallet
const wallet = await generator.createWallet();
console.log(wallet.address, wallet.mnemonic);

// Create multiple wallets
const wallets = await generator.createMultipleWallets(5);

// Save wallet info
await generator.saveWalletInfo(wallet, 'my-wallet.json');
```

### Faucet Requester

```javascript
import DemosFaucetRequester from './src/faucet-requester.js';

const requester = new DemosFaucetRequester();

// Check faucet status
const status = await requester.getFaucetStatus();

// Request tokens
const result = await requester.requestTokens('0x123...');

// Request for multiple addresses
const results = await requester.requestTokensForMultiple([
  '0x123...',
  '0x456...'
]);
```

## Configuration

### Environment Variables

```bash
# Optional: Custom RPC endpoint
DEMOS_RPC_URL=https://node2.demos.sh

# Optional: Custom faucet backend
FAUCET_BACKEND_URL=https://faucetbackend.demos.sh
```

### Wallet Files

Generated wallets are saved as JSON files:

```json
{
  "created": "2024-01-01T12:00:00.000Z",
  "mnemonic": "abandon ability able about above...",
  "addresses": {
    "primary": "0x1234567890abcdef...",
    "ed25519": "0xabcdef1234567890..."
  },
  "network": "https://node2.demos.sh",
  "note": "Keep this file secure!"
}
```

## Security Considerations

- 🔐 **Mnemonics are saved in plain text** - keep wallet files secure
- 🗑️ **Delete wallet files after use** if you don't need them
- ⚠️ **This is for testnet only** - don't use for mainnet funds
- 🔄 **Rate limiting** - tool includes delays to avoid overwhelming the faucet

## Error Handling

The tool includes comprehensive error handling:

- **Network errors**: Automatic retries with exponential backoff
- **Rate limiting**: Intelligent delays between requests
- **Invalid addresses**: Input validation and helpful error messages
- **File operations**: Graceful handling of missing/corrupt files

## Troubleshooting

### Common Issues

1. **"Failed to connect to Demos Network"**
   - Check internet connection
   - Verify RPC endpoint is accessible
   - Try alternative RPC: `https://demosnode.discus.sh`

2. **"Rate limited" or 429 errors**
   - Increase delay between requests: `--delay 15000`
   - Wait a few minutes before trying again

3. **"Invalid address format"**
   - Ensure address starts with `0x`
   - Check address length (should be 40-64 characters)

4. **Faucet request fails**
   - Verify faucet has sufficient balance
   - Check if address already received tokens recently
   - Try a different address

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* node src/cli.js wallet create

# Check network connectivity
curl https://faucetbackend.demos.sh/api/balance
```

## Examples

### Create 10 wallets and request tokens

```bash
#!/bin/bash

# Create wallets
node src/cli.js wallet create-multiple --count 10

# Wait a moment
sleep 5

# Request tokens for all created wallets
node src/cli.js faucet request-from-files

echo "Done! Check wallet files for addresses and mnemonics."
```

### Bulk token distribution

```bash
# Create many wallets for testing
node src/cli.js auto --count 20 --delay 15000

# Check balances later (you'll need to implement balance checking)
for file in demos-wallet-*.json; do
  echo "Checking $file..."
  # Extract address and check balance
done
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and testing purposes only. Use responsibly and only on testnets. The authors are not responsible for any loss of funds or misuse of this tool.