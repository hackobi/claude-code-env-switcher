#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';

const TARGET_ADDRESS = '0xe69e8d2b8c7fbfc3282eaaac1192bd48087f8f17c78290aad57c77ec4bb7b9fe';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function transferBalance(walletData, targetAddress, amount, walletName) {
    try {
        console.log(`\n🚀 ${walletName}: Starting transfer of ${amount} DEM...`);
        
        // Connect and setup wallet
        await demos.connect('https://node2.demos.sh');
        await demos.connectWallet(walletData.mnemonic);
        console.log('   ✅ Connected and wallet loaded');
        
        // Create signed transaction
        console.log(`   📝 Creating signed transaction for ${amount} DEM...`);
        const signedTransaction = await demos.transfer(targetAddress, amount);
        console.log('   ✅ Signed transaction created');
        
        // Confirm transaction
        console.log('   ⚡ Confirming transaction...');
        const validationData = await demos.confirm(signedTransaction);
        
        if (!validationData.response.data.valid) {
            console.log(`   ❌ Transaction validation failed: ${validationData.response.data.message}`);
            return false;
        }
        console.log('   ✅ Transaction confirmed');
        
        // Broadcast transaction
        console.log('   📡 Broadcasting transaction...');
        const broadcastResult = await demos.broadcast(validationData);
        console.log('   ✅ Transaction broadcasted!');
        
        console.log('   🎉 Transfer initiated successfully!');
        return true;
        
    } catch (error) {
        console.log(`   ❌ Transfer error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🔍 CHECKING OLD WALLET FILES');
    console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);
    
    const oldWallets = [
        './demos-wallet-1.json',
        './demos-wallet-2.json',
        './demos-wallet-2025-11-10T14-20-43-754Z.json'
    ];
    
    // Check initial target balance
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const initialTargetBalance = parseFloat(initialTarget?.balance || '0');
    console.log(`🏦 Target initial balance: ${initialTargetBalance} DEM\n`);
    
    const walletsWithBalance = [];
    
    for (const walletFile of oldWallets) {
        try {
            console.log(`\n💰 Checking ${walletFile}...`);
            const walletData = JSON.parse(await fs.readFile(walletFile, 'utf8'));
            
            const address = walletData.addresses?.primary || walletData.address;
            
            if (!address) {
                console.log('   ❌ No valid address found in wallet file');
                continue;
            }
            
            console.log(`   Address: ${address.substring(0, 30)}...`);
            
            const info = await demos.getAddressInfo(address);
            const balance = parseFloat(info?.balance || '0');
            console.log(`   Balance: ${balance} DEM`);
            
            if (balance >= 1) {
                const transferAmount = Math.floor(balance - 0.5);
                walletsWithBalance.push({
                    ...walletData,
                    address: address,
                    file: walletFile,
                    balance: balance,
                    transferAmount: transferAmount
                });
                console.log(`   ✅ Available for transfer: ${transferAmount} DEM`);
            } else if (balance > 0) {
                console.log(`   ⚠️ Balance too low for transfer`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        await delay(1000);
    }
    
    if (walletsWithBalance.length === 0) {
        console.log('\n❌ No old wallets have sufficient balance for transfer');
        return;
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('TRANSFERRING BALANCES');
    console.log('=' .repeat(70));
    
    for (const wallet of walletsWithBalance) {
        await transferBalance(wallet, TARGET_ADDRESS, wallet.transferAmount, wallet.file);
        await delay(5000);
    }
    
    // Final check
    console.log('\n⏳ Waiting for confirmation...');
    await delay(10000);
    
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const finalTargetBalance = parseFloat(finalTarget?.balance || '0');
    const increase = finalTargetBalance - initialTargetBalance;
    
    console.log('\n' + '=' .repeat(70));
    console.log('FINAL RESULT');
    console.log('=' .repeat(70));
    console.log(`🏦 Target balance: ${initialTargetBalance} → ${finalTargetBalance} DEM`);
    console.log(`📈 Total increase: ${increase} DEM`);
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});