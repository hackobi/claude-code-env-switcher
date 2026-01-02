#!/usr/bin/env node

import { DemosWalletGenerator } from './src/wallet-generator.js';
import { DemosFaucetRequester } from './src/faucet-requester.js';
import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xa39e7839197df48798a227c27918f1cc58fbdbf34e6389caf15cb7fc15269b7a';
const NUM_WALLETS = 10;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function correctTransfer(walletData, targetAddress, amount, walletName) {
    try {
        console.log(`\n🚀 ${walletName}: Starting transfer sequence...`);
        
        // Connect and setup wallet
        await demos.connect('https://node2.demos.sh');
        await demos.connectWallet(walletData.mnemonic);
        console.log('   ✅ Connected and wallet loaded');
        
        // Check balance
        const info = await demos.getAddressInfo(walletData.address);
        const balance = parseFloat(info?.balance || '0');
        console.log(`   💰 Current balance: ${balance} DEM`);
        
        if (balance < amount + 1) {
            console.log(`   ⚠️ Insufficient balance for ${amount} DEM transfer`);
            return false;
        }
        
        // Create signed transaction using demos.transfer()
        console.log(`   📝 Creating signed transaction for ${amount} DEM...`);
        const signedTransaction = await demos.transfer(targetAddress, amount);
        console.log('   ✅ Signed transaction created');
        
        // Confirm transaction (validation)
        console.log('   ⚡ Confirming transaction...');
        const validationData = await demos.confirm(signedTransaction);
        console.log('   ✅ Transaction confirmed');
        
        if (!validationData.response.data.valid) {
            console.log(`   ❌ Transaction validation failed: ${validationData.response.data.message}`);
            return false;
        }
        
        // Broadcast transaction
        console.log('   📡 Broadcasting transaction...');
        const broadcastResult = await demos.broadcast(validationData);
        console.log('   ✅ Transaction broadcasted!');
        
        // Wait for confirmation
        console.log('   ⏳ Waiting for network confirmation...');
        await delay(8000);
        
        // Check final balance
        const finalInfo = await demos.getAddressInfo(walletData.address);
        const finalBalance = parseFloat(finalInfo?.balance || '0');
        const transferred = balance - finalBalance;
        
        console.log(`   📊 Final balance: ${finalBalance} DEM`);
        console.log(`   💸 Actually transferred: ${transferred.toFixed(4)} DEM`);
        
        if (transferred > 0) {
            console.log(`   🎉 SUCCESS! ${transferred.toFixed(4)} DEM confirmed transferred!`);
            return transferred;
        } else {
            console.log(`   ⚠️ No balance change detected`);
            return false;
        }
        
    } catch (error) {
        console.log(`   ❌ Transfer error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 NEW BATCH OPERATION - 10 WALLETS');
    console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);
    
    const walletGenerator = new DemosWalletGenerator();
    const faucetRequester = new DemosFaucetRequester();
    const walletDir = path.join(__dirname, 'batch-wallets');
    
    // Create directory for wallets
    await fs.mkdir(walletDir, { recursive: true });
    
    // Check initial target balance
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const initialTargetBalance = parseFloat(initialTarget?.balance || '0');
    console.log(`🏦 Target initial balance: ${initialTargetBalance} DEM`);
    
    // Check faucet status
    console.log('\n📊 Checking faucet status...');
    const faucetStatus = await faucetRequester.getFaucetStatus();
    if (!faucetStatus.success) {
        console.log('❌ Cannot continue without faucet access');
        return;
    }
    
    console.log('=' .repeat(70));
    console.log('STEP 1: GENERATING 10 NEW WALLETS');
    console.log('=' .repeat(70));
    
    const wallets = [];
    
    // Generate 10 wallets
    for (let i = 1; i <= NUM_WALLETS; i++) {
        console.log(`\n📝 Creating wallet ${i}/${NUM_WALLETS}...`);
        const walletData = await walletGenerator.createWallet();
        wallets.push(walletData);
        
        // Save wallet to file
        const fileName = path.join(walletDir, `wallet-${i}.json`);
        await fs.writeFile(fileName, JSON.stringify(walletData, null, 2));
        console.log(`✅ Wallet ${i} saved: ${walletData.address.substring(0, 20)}...`);
        
        // Small delay between wallet creations
        await delay(1000);
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('STEP 2: REQUESTING FAUCET TOKENS');
    console.log('=' .repeat(70));
    
    let successfulFaucetRequests = 0;
    
    // Request tokens from faucet for each wallet
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        console.log(`\n💧 Requesting faucet tokens for wallet ${i + 1}...`);
        console.log(`   Address: ${wallet.address.substring(0, 30)}...`);
        
        const faucetResult = await faucetRequester.requestTokens(wallet.address);
        
        if (faucetResult.success) {
            console.log(`   ✅ Faucet request successful!`);
            successfulFaucetRequests++;
        } else {
            console.log(`   ❌ Faucet request failed: ${faucetResult.error}`);
        }
        
        // Rate limiting delay between faucet requests
        if (i < wallets.length - 1) {
            console.log('   ⏳ Waiting 8 seconds (rate limiting)...');
            await delay(8000);
        }
    }
    
    console.log(`\n📊 Faucet Summary: ${successfulFaucetRequests}/${NUM_WALLETS} successful`);
    
    // Wait for transactions to be processed
    console.log('\n⏳ Waiting 30 seconds for faucet transactions to process...');
    await delay(30000);
    
    console.log('\n' + '=' .repeat(70));
    console.log('STEP 3: VERIFYING WALLET BALANCES');
    console.log('=' .repeat(70));
    
    let totalAvailable = 0;
    const fundedWallets = [];
    
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        console.log(`\n💰 Checking balance for wallet ${i + 1}...`);
        
        await demos.connect('https://node2.demos.sh');
        const info = await demos.getAddressInfo(wallet.address);
        const balance = parseFloat(info?.balance || '0');
        
        console.log(`   Address: ${wallet.address.substring(0, 30)}...`);
        console.log(`   Balance: ${balance} DEM`);
        
        if (balance > 2) { // Need at least 2 DEM (1 for transfer + 1 for gas)
            fundedWallets.push({ ...wallet, balance });
            totalAvailable += balance - 1; // Reserve 1 DEM for gas
            console.log(`   ✅ Wallet funded! Available for transfer: ${balance - 1} DEM`);
        } else {
            console.log(`   ⚠️ Insufficient balance (${balance} DEM)`);
        }
    }
    
    console.log(`\n📊 Funding Summary:`);
    console.log(`   • Funded wallets: ${fundedWallets.length}/${NUM_WALLETS}`);
    console.log(`   • Total available for transfer: ${totalAvailable.toFixed(4)} DEM`);
    
    if (fundedWallets.length === 0) {
        console.log('❌ No funded wallets available for transfer');
        return;
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('STEP 4: BULK TRANSFER TO TARGET');
    console.log('=' .repeat(70));
    
    let totalTransferred = 0;
    let successfulTransfers = 0;
    
    for (let i = 0; i < fundedWallets.length; i++) {
        const wallet = fundedWallets[i];
        const transferAmount = wallet.balance - 1; // Reserve 1 DEM for gas
        
        console.log(`\n📤 Transfer ${i + 1}/${fundedWallets.length}:`);
        console.log(`   From: ${wallet.address.substring(0, 30)}...`);
        console.log(`   Amount: ${transferAmount} DEM`);
        
        const transferResult = await correctTransfer(
            wallet, 
            TARGET_ADDRESS, 
            transferAmount, 
            `wallet-${i + 1}`
        );
        
        if (transferResult) {
            totalTransferred += transferResult;
            successfulTransfers++;
        }
        
        // Delay between transfers
        if (i < fundedWallets.length - 1) {
            console.log('   ⏳ Waiting 5 seconds before next transfer...');
            await delay(5000);
        }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('FINAL SUMMARY');
    console.log('=' .repeat(70));
    
    // Check final target balance
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const finalTargetBalance = parseFloat(finalTarget?.balance || '0');
    const targetIncrease = finalTargetBalance - initialTargetBalance;
    
    console.log(`📊 RESULTS:`);
    console.log(`   • Wallets created: ${NUM_WALLETS}`);
    console.log(`   • Wallets funded: ${successfulFaucetRequests}`);
    console.log(`   • Successful transfers: ${successfulTransfers}/${fundedWallets.length}`);
    console.log(`   • Total transferred: ${totalTransferred.toFixed(4)} DEM`);
    console.log(`\n🏦 TARGET WALLET:`);
    console.log(`   • Initial balance: ${initialTargetBalance} DEM`);
    console.log(`   • Final balance: ${finalTargetBalance} DEM`);
    console.log(`   • Increase: ${targetIncrease.toFixed(4)} DEM`);
    console.log(`\n🎯 Target Address: ${TARGET_ADDRESS}`);
    console.log('=' .repeat(70));
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});