#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function correctTransfer(walletData, amount, walletName) {
    try {
        console.log(`\n🚀 ${walletName}: Starting correct transfer sequence...`);
        
        // Step 1: Connect and setup wallet
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
        
        // Step 2: Create signed transaction using demos.transfer()
        console.log(`   📝 Creating signed transaction for ${amount} DEM...`);
        const signedTransaction = await demos.transfer(TARGET_ADDRESS, amount);
        console.log('   ✅ Signed transaction created');
        
        // Step 3: Confirm transaction (validation)
        console.log('   ⚡ Confirming transaction...');
        const validationData = await demos.confirm(signedTransaction);
        console.log('   ✅ Transaction confirmed');
        console.log(`   📊 Validation response: ${validationData.response.data.valid ? 'VALID' : 'INVALID'}`);
        
        if (!validationData.response.data.valid) {
            console.log(`   ❌ Transaction validation failed: ${validationData.response.data.message}`);
            return false;
        }
        
        // Step 4: Broadcast transaction
        console.log('   📡 Broadcasting transaction...');
        const broadcastResult = await demos.broadcast(validationData);
        console.log('   ✅ Transaction broadcasted!');
        console.log(`   📤 Broadcast result: ${JSON.stringify(broadcastResult)}`);
        
        // Wait for confirmation
        console.log('   ⏳ Waiting for network confirmation...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
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
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🔧 TESTING CORRECT TRANSFER SEQUENCE');
    console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);
    
    // Check initial target balance
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const initialTargetBalance = parseFloat(initialTarget?.balance || '0');
    console.log(`🏦 Target initial balance: ${initialTargetBalance} DEM`);
    console.log('=' .repeat(70));
    
    // Test with wallet-1 first
    try {
        const walletData = JSON.parse(await fs.readFile('batch-wallets/wallet-1.json', 'utf8'));
        
        // Test with a small amount first
        const testAmount = 5;
        const result = await correctTransfer(walletData, testAmount, 'wallet-1.json (TEST)');
        
        if (result) {
            console.log(`\n✅ TEST SUCCESSFUL! ${result} DEM transferred`);
            console.log('🚀 Now processing all remaining wallets...\n');
            
            // If test worked, process all wallets
            const files = await fs.readdir('batch-wallets');
            const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
            
            let totalTransferred = 0;
            let successCount = 0;
            
            for (const file of walletFiles) {
                try {
                    const data = JSON.parse(await fs.readFile(`batch-wallets/${file}`, 'utf8'));
                    
                    // Skip wallet-1 since we already tested it
                    let amountToSend = 95;
                    if (file === 'wallet-1.json') {
                        amountToSend = 90; // Send remaining from wallet-1
                    }
                    
                    const transferResult = await correctTransfer(data, amountToSend, file);
                    
                    if (transferResult) {
                        totalTransferred += transferResult;
                        successCount++;
                    }
                    
                    // Wait between transfers
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                } catch (error) {
                    console.log(`❌ ${file}: ${error.message}`);
                }
            }
            
            console.log('\n' + '=' .repeat(70));
            console.log(`📊 FINAL SUMMARY:`);
            console.log(`✅ Successful transfers: ${successCount}/${walletFiles.length}`);
            console.log(`💰 Total transferred: ${totalTransferred.toFixed(4)} DEM`);
            
        } else {
            console.log(`\n❌ TEST FAILED - Need to debug further`);
        }
        
    } catch (error) {
        console.error(`❌ Test error: ${error.message}`);
    }
    
    // Check final target balance
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const finalTargetBalance = parseFloat(finalTarget?.balance || '0');
    const increase = finalTargetBalance - initialTargetBalance;
    
    console.log(`\n🏦 Target balance: ${initialTargetBalance} → ${finalTargetBalance} DEM`);
    console.log(`📈 Total increase: ${increase.toFixed(4)} DEM`);
    console.log('=' .repeat(70));
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});