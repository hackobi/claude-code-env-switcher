#!/bin/bash

# Demos Faucet Automation Demo Script
# This script demonstrates the complete automation workflow

echo "🎯 Demos Faucet Automation Demo"
echo "================================"
echo ""

# Clean up any existing wallet files
echo "🧹 Cleaning up existing wallet files..."
rm -f demos-wallet-*.json
echo ""

# Check faucet status first
echo "📊 Step 1: Checking faucet status..."
node src/cli.js faucet status
echo ""

# Create a few wallets and request tokens
echo "🤖 Step 2: Running automated workflow..."
echo "Creating 3 wallets and requesting tokens..."
node src/cli.js auto --count 3 --delay 8000
echo ""

# Show the created wallet files
echo "📁 Step 3: Created wallet files:"
ls -la demos-wallet-*.json 2>/dev/null || echo "No wallet files found"
echo ""

# Optional: Show wallet contents (addresses only)
echo "📋 Step 4: Wallet addresses:"
for file in demos-wallet-*.json; do
  if [ -f "$file" ]; then
    echo "File: $file"
    cat "$file" | jq -r '.addresses.primary' | sed 's/^/  Address: /'
    echo ""
  fi
done

echo "✅ Demo completed!"
echo ""
echo "🔐 Security Note: Wallet files contain private mnemonics."
echo "    Keep them secure and delete when no longer needed."
echo ""
echo "🧹 To clean up: rm demos-wallet-*.json"