#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import { checkRealBalances } from './check-real-balances.js';

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function performRealTransfer(walletData, amount) {
    try {
        console.log(`\n🔄 Transferring from ${walletData.address.substring(0, 20)}...`);
        
        // Connect fresh for each wallet
        await demos.connect('https://node2.demos.sh');
        await demos.connectWallet(walletData.mnemonic);
        
        console.log(`   💰 Amount: ${amount} DEM`);
        console.log(`   🎯 To: ${TARGET_ADDRESS.substring(0, 20)}...`);
        
        // Perform the transfer - this method has worked before
        const result = await demos.transfer(TARGET_ADDRESS, amount);
        
        console.log(`   📝 Result: ${JSON.stringify(result)}`);
        
        // Check if we got a hash
        if (result && (result.hash || typeof result === 'string')) {
            const hash = result.hash || result;
            console.log(`   ✅ Transaction hash: ${hash}`);
            
            // Wait a moment for processing
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verify balance changed
            const newInfo = await demos.getAddressInfo(walletData.address);
            const newBalance = parseFloat(newInfo?.balance || '0');
            
            if (newBalance < 100) {
                console.log(`   🎉 CONFIRMED! New balance: ${newBalance} DEM`);
                return { success: true, hash, amountSent: 100 - newBalance };
            } else {
                console.log(`   ⚠️ Balance unchanged: ${newBalance} DEM`);
                return { success: false, reason: 'Balance unchanged' };
            }
        } else {
            console.log(`   ❌ No transaction hash returned`);
            return { success: false, reason: 'No hash' };
        }
        
    } catch (error) {
        console.log(`   ❌ Transfer error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 ATTEMPTING REAL TRANSFERS NOW');
    console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);
    
    // Check target balance before
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const initialTargetBalance = parseFloat(initialTarget?.balance || '0');
    console.log(`📊 Target initial balance: ${initialTargetBalance} DEM\n`);
    
    // Get funded wallets
    const fundedWallets = await checkRealBalances();
    console.log(`\n🎯 Processing ${fundedWallets.length} funded wallets...\n`);
    console.log('=' .repeat(60));
    
    let successCount = 0;
    let totalSent = 0;
    const results = [];
    
    for (const wallet of fundedWallets) {
        console.log(`\n💼 ${wallet.file} (${wallet.balance} DEM available)`);
        
        // Try to send 99 DEM (keep 1 for gas)
        const amountToSend = 99;
        const result = await performRealTransfer(wallet.walletData, amountToSend);
        
        results.push({ ...wallet, transferResult: result });
        
        if (result.success) {
            successCount++;
            totalSent += result.amountSent;
        }
        
        // Wait between transfers
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Check target balance after
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 FINAL VERIFICATION');
    
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const finalTargetBalance = parseFloat(finalTarget?.balance || '0');
    const targetIncrease = finalTargetBalance - initialTargetBalance;
    
    console.log(`\n🏦 Target Balance Results:`);
    console.log(`   Initial: ${initialTargetBalance} DEM`);
    console.log(`   Final: ${finalTargetBalance} DEM`);
    console.log(`   Increase: ${targetIncrease} DEM`);
    
    console.log(`\n📋 Transfer Summary:`);
    console.log(`   Successful transfers: ${successCount}/${fundedWallets.length}`);
    console.log(`   Total sent from wallets: ${totalSent.toFixed(4)} DEM`);
    console.log(`   Target received: ${targetIncrease.toFixed(4)} DEM`);
    
    if (targetIncrease > 0) {
        console.log(`\n🎉 SUCCESS! Real tokens transferred to target!`);
    } else {
        console.log(`\n😞 No tokens received by target`);
    }
    
    // Show individual results
    console.log(`\n📄 Individual Results:`);
    results.forEach(r => {
        const status = r.transferResult.success ? '✅' : '❌';
        const details = r.transferResult.success 
            ? `${r.transferResult.amountSent.toFixed(4)} DEM sent`
            : r.transferResult.reason || r.transferResult.error;
        console.log(`   ${status} ${r.file}: ${details}`);
    });
    
    console.log('\n' + '=' .repeat(60));
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});