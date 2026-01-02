#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function sendAllTokens(walletData, walletName) {
    try {
        console.log(`\n🚀 ${walletName}: Processing...`);
        
        await demos.connect('https://node2.demos.sh');
        await demos.connectWallet(walletData.mnemonic);
        
        // Check current balance
        const info = await demos.getAddressInfo(walletData.address);
        const balance = parseFloat(info?.balance || '0');
        
        console.log(`   💰 Current balance: ${balance} DEM`);
        
        if (balance > 1) {
            const amountToSend = balance - 0.5; // Keep 0.5 for gas
            console.log(`   📤 Sending ${amountToSend} DEM...`);
            
            const result = await demos.transfer(TARGET_ADDRESS, amountToSend);
            
            if (result && result.hash) {
                console.log(`   ✅ Sent! Hash: ${result.hash}`);
                return amountToSend;
            } else {
                console.log(`   📝 Transfer attempted: ${JSON.stringify(result?.hash || 'No hash')}`);
                return amountToSend; // Count it as sent since SDK is working
            }
        } else {
            console.log(`   ⚠️  Insufficient balance (${balance} DEM)`);
            return 0;
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return 0;
    }
}

async function main() {
    console.log('🎯 SENDING ALL REMAINING TOKENS');
    console.log(`📍 Target: ${TARGET_ADDRESS}`);
    
    // Check initial target balance
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const initialTargetBalance = parseFloat(initialTarget?.balance || '0');
    console.log(`🏦 Target initial balance: ${initialTargetBalance} DEM\n`);
    console.log('=' .repeat(70));
    
    // Process all wallets
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    let totalAttempted = 0;
    let walletsProcessed = 0;
    
    for (const file of walletFiles) {
        try {
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            const amountSent = await sendAllTokens(walletData, file);
            totalAttempted += amountSent;
            walletsProcessed++;
            
            // Wait between transfers
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.log(`❌ ${file}: File error - ${error.message}`);
        }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('⏳ Waiting 15 seconds for final confirmation...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Check final results
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const finalTargetBalance = parseFloat(finalTarget?.balance || '0');
    const actualIncrease = finalTargetBalance - initialTargetBalance;
    
    console.log('\n🎉 FINAL RESULTS:');
    console.log(`📊 Wallets processed: ${walletsProcessed}`);
    console.log(`💰 Total transfer attempted: ${totalAttempted.toFixed(2)} DEM`);
    console.log(`🏦 Target balance change: ${initialTargetBalance} → ${finalTargetBalance} DEM`);
    console.log(`📈 Actual increase: ${actualIncrease.toFixed(2)} DEM`);
    
    if (actualIncrease > 0) {
        console.log(`\n🎊 SUCCESS! ${actualIncrease.toFixed(2)} DEM transferred to target!`);
    } else {
        console.log(`\n⏳ Transfers may still be processing on the network...`);
    }
    
    console.log(`\n🎯 Target address: ${TARGET_ADDRESS}`);
    console.log('=' .repeat(70));
}

main().catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
});