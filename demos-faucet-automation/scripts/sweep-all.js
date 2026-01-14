#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xe69e8d2b8c7fbfc3282eaaac1192bd48087f8f17c78290aad57c77ec4bb7b9fe';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkWalletBalance(walletData) {
    try {
        await demos.connect('https://node2.demos.sh');
        const info = await demos.getAddressInfo(walletData.address);
        return parseFloat(info?.balance || '0');
    } catch (error) {
        console.log(`   ❌ Error checking balance: ${error.message}`);
        return 0;
    }
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
        
        // Wait and verify
        console.log('   ⏳ Waiting for network confirmation...');
        await delay(8000);
        
        const finalBalance = await checkWalletBalance(walletData);
        const transferred = amount - finalBalance;
        
        if (transferred > 0) {
            console.log(`   🎉 SUCCESS! Transferred approximately ${transferred.toFixed(2)} DEM`);
            return transferred;
        } else {
            console.log(`   ⚠️ Transfer may be pending or failed`);
            return 0;
        }
        
    } catch (error) {
        console.log(`   ❌ Transfer error: ${error.message}`);
        return 0;
    }
}

async function findAllWalletFiles() {
    const walletFiles = [];
    
    // Check batch-wallets directory
    try {
        const batchDir = path.join(__dirname, 'batch-wallets');
        const batchFiles = await fs.readdir(batchDir);
        for (const file of batchFiles) {
            if (file.endsWith('.json')) {
                walletFiles.push(path.join(batchDir, file));
            }
        }
    } catch (error) {
        console.log('   No batch-wallets directory found');
    }
    
    // Check root directory for individual wallet files
    try {
        const rootFiles = await fs.readdir(__dirname);
        for (const file of rootFiles) {
            if (file.startsWith('demos-wallet-') && file.endsWith('.json')) {
                walletFiles.push(path.join(__dirname, file));
            }
        }
    } catch (error) {
        console.log('   Error reading root directory');
    }
    
    return walletFiles;
}

async function main() {
    console.log('🔍 SWEEPING ALL WALLETS FOR REMAINING BALANCES');
    console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);
    
    // Check initial target balance
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const initialTargetBalance = parseFloat(initialTarget?.balance || '0');
    console.log(`🏦 Target initial balance: ${initialTargetBalance} DEM`);
    
    console.log('\n' + '=' .repeat(70));
    console.log('STEP 1: FINDING ALL WALLET FILES');
    console.log('=' .repeat(70));
    
    const walletFiles = await findAllWalletFiles();
    console.log(`📁 Found ${walletFiles.length} wallet files to check\n`);
    
    if (walletFiles.length === 0) {
        console.log('❌ No wallet files found');
        return;
    }
    
    console.log('=' .repeat(70));
    console.log('STEP 2: CHECKING WALLET BALANCES');
    console.log('=' .repeat(70));
    
    const walletsWithBalance = [];
    let totalAvailable = 0;
    
    for (let i = 0; i < walletFiles.length; i++) {
        const file = walletFiles[i];
        const fileName = path.basename(file);
        
        try {
            console.log(`\n💰 Checking ${fileName}...`);
            const walletData = JSON.parse(await fs.readFile(file, 'utf8'));
            const balance = await checkWalletBalance(walletData);
            
            console.log(`   Address: ${walletData.address.substring(0, 30)}...`);
            console.log(`   Balance: ${balance} DEM`);
            
            if (balance >= 1) { // Need at least 1 DEM to make transfer worthwhile
                const availableToTransfer = Math.floor(balance - 0.5); // Reserve 0.5 for gas
                if (availableToTransfer > 0) {
                    walletsWithBalance.push({
                        ...walletData,
                        file: fileName,
                        balance: balance,
                        transferAmount: availableToTransfer
                    });
                    totalAvailable += availableToTransfer;
                    console.log(`   ✅ Available for transfer: ${availableToTransfer} DEM`);
                }
            } else if (balance > 0) {
                console.log(`   ⚠️ Balance too low for transfer (${balance} DEM)`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error reading wallet: ${error.message}`);
        }
        
        // Small delay to avoid rate limiting
        await delay(500);
    }
    
    console.log(`\n📊 Balance Summary:`);
    console.log(`   • Wallets checked: ${walletFiles.length}`);
    console.log(`   • Wallets with balance: ${walletsWithBalance.length}`);
    console.log(`   • Total available to transfer: ${totalAvailable} DEM`);
    
    if (walletsWithBalance.length === 0) {
        console.log('\n❌ No wallets with sufficient balance for transfer');
        return;
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('STEP 3: TRANSFERRING REMAINING BALANCES');
    console.log('=' .repeat(70));
    
    let totalTransferred = 0;
    let successfulTransfers = 0;
    
    for (let i = 0; i < walletsWithBalance.length; i++) {
        const wallet = walletsWithBalance[i];
        
        console.log(`\n📤 Transfer ${i + 1}/${walletsWithBalance.length}: ${wallet.file}`);
        console.log(`   From: ${wallet.address.substring(0, 30)}...`);
        console.log(`   Amount: ${wallet.transferAmount} DEM`);
        
        const result = await transferBalance(
            wallet,
            TARGET_ADDRESS,
            wallet.transferAmount,
            wallet.file
        );
        
        if (result > 0) {
            totalTransferred += result;
            successfulTransfers++;
        }
        
        // Delay between transfers
        if (i < walletsWithBalance.length - 1) {
            console.log('   ⏳ Waiting 5 seconds before next transfer...');
            await delay(5000);
        }
    }
    
    // Wait a bit for all transactions to process
    console.log('\n⏳ Waiting for final confirmation...');
    await delay(10000);
    
    console.log('\n' + '=' .repeat(70));
    console.log('FINAL SUMMARY');
    console.log('=' .repeat(70));
    
    // Check final target balance
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    const finalTargetBalance = parseFloat(finalTarget?.balance || '0');
    const targetIncrease = finalTargetBalance - initialTargetBalance;
    
    console.log(`📊 RESULTS:`);
    console.log(`   • Wallets checked: ${walletFiles.length}`);
    console.log(`   • Wallets with balance: ${walletsWithBalance.length}`);
    console.log(`   • Successful transfers: ${successfulTransfers}`);
    console.log(`   • Total attempted: ${totalAvailable} DEM`);
    console.log(`   • Total transferred: ${totalTransferred.toFixed(2)} DEM`);
    console.log(`\n🏦 TARGET WALLET:`);
    console.log(`   • Initial balance: ${initialTargetBalance} DEM`);
    console.log(`   • Final balance: ${finalTargetBalance} DEM`);
    console.log(`   • Actual increase: ${targetIncrease.toFixed(2)} DEM`);
    console.log(`\n🎯 Target Address: ${TARGET_ADDRESS}`);
    console.log('=' .repeat(70));
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});