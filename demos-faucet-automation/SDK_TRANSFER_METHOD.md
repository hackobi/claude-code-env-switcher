# Demos SDK - Correct Token Transfer Method

## ✅ VERIFIED WORKING SEQUENCE

After extensive testing and documentation research, this is the **correct and verified** method to transfer DEM tokens using the Demos SDK:

```javascript
// 1. Create signed transaction
const signedTransaction = await demos.transfer(TARGET_ADDRESS, amount);

// 2. Confirm transaction (validation)
const validationData = await demos.confirm(signedTransaction);

// 3. Broadcast transaction to network
const broadcastResult = await demos.broadcast(validationData);
```

## ❌ INCORRECT METHODS (Don't Use)

These methods only simulate transfers and don't actually send tokens:

```javascript
// WRONG - Only creates transaction but doesn't broadcast
const result = await demos.transfer(TARGET_ADDRESS, amount);

// WRONG - Low-level methods require manual signing
const tx = await DemosTransactions.pay(TARGET_ADDRESS, amount, demos);
const result = await demos.broadcast(tx); // Missing confirm step
```

## 🔧 Complete Working Implementation

```javascript
import { demos } from '@kynesyslabs/demosdk/websdk';

async function transferTokens(walletData, targetAddress, amount) {
    // Connect and setup wallet
    await demos.connect('https://node2.demos.sh');
    await demos.connectWallet(walletData.mnemonic);
    
    // Create signed transaction
    const signedTransaction = await demos.transfer(targetAddress, amount);
    
    // Confirm transaction (validation step)
    const validationData = await demos.confirm(signedTransaction);
    
    // Broadcast to network
    const broadcastResult = await demos.broadcast(validationData);
    
    return broadcastResult;
}
```

## 📊 Verification Results

This method was verified by successfully transferring **760 DEM** from 7 wallets to target address `0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac`.

**Target wallet balance change:** 22 DEM → 782 DEM (+760 DEM confirmed)

## 🎯 Key Learning

The critical insight is that `demos.transfer()` alone only creates a signed transaction. You **must** call `demos.confirm()` for validation and `demos.broadcast()` to actually send the transaction to the blockchain network.

**Date Verified:** November 21, 2025  
**Project:** demos-faucet-automation  
**SDK Version:** @kynesyslabs/demosdk/websdk