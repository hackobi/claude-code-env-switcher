#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function transferWithVerification(walletData, amount) {
    try {
        console.log(chalk.blue(`\n💼 Processing: ${walletData.address}`));
        
        // Connect and setup wallet
        await demos.connect('https://node2.demos.sh');
        await demos.connectWallet(walletData.mnemonic);
        
        // Get initial balance
        const ed25519Address = await demos.getEd25519Address();
        const initialInfo = await demos.getAddressInfo(ed25519Address);
        const initialBalance = parseFloat(initialInfo?.balance || '0');
        
        console.log(chalk.yellow(`   📊 Initial balance: ${initialBalance} DEM`));
        
        if (initialBalance < amount + 0.1) {
            console.log(chalk.red(`   ❌ Insufficient balance for ${amount} DEM transfer`));
            return false;
        }
        
        // Attempt transfer using the demos.transfer method
        console.log(chalk.blue(`   💸 Transferring ${amount} DEM to target...`));
        const transferResult = await demos.transfer(TARGET_ADDRESS, amount);
        
        console.log(chalk.green(`   📝 Transfer submitted: ${transferResult}`));
        
        // Wait for network processing
        console.log(chalk.gray('   ⏳ Waiting for network processing...'));
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        // Check if balance actually changed
        const finalInfo = await demos.getAddressInfo(ed25519Address);
        const finalBalance = parseFloat(finalInfo?.balance || '0');
        
        console.log(chalk.yellow(`   📊 Final balance: ${finalBalance} DEM`));
        
        const actualTransfer = initialBalance - finalBalance;
        console.log(chalk.cyan(`   💱 Balance change: ${actualTransfer.toFixed(4)} DEM`));
        
        if (actualTransfer > 0) {
            console.log(chalk.green(`   ✅ CONFIRMED: ${actualTransfer.toFixed(4)} DEM transferred!`));
            return actualTransfer;
        } else {
            console.log(chalk.red(`   ❌ No balance change detected`));
            return false;
        }
        
    } catch (error) {
        console.log(chalk.red(`   ❌ Error: ${error.message}`));
        return false;
    }
}

async function main() {
    console.log(chalk.bold.magenta('\n🎯 FINAL TRANSFER ATTEMPT'));
    console.log(chalk.cyan(`📍 Target: ${TARGET_ADDRESS}\n`));
    
    // Check target balance before
    try {
        await demos.connect('https://node2.demos.sh');
        const initialTargetInfo = await demos.getAddressInfo(TARGET_ADDRESS);
        console.log(chalk.blue(`🏦 Target balance before: ${initialTargetInfo?.balance || '0'} DEM`));
    } catch (error) {
        console.log(chalk.yellow(`Could not check initial target balance`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Load wallets
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    let totalTransferred = 0;
    let successCount = 0;
    
    // Process each wallet
    for (let i = 0; i < walletFiles.length; i++) {
        const file = walletFiles[i];
        console.log(chalk.yellow(`\n[${i + 1}/${walletFiles.length}] ${file}`));
        
        try {
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            const transferAmount = await transferWithVerification(walletData, 99);
            
            if (transferAmount) {
                totalTransferred += transferAmount;
                successCount++;
            }
            
        } catch (error) {
            console.log(chalk.red(`   ❌ File error: ${error.message}`));
        }
    }
    
    // Check target balance after
    console.log('\n' + '='.repeat(60));
    try {
        await demos.connect('https://node2.demos.sh');
        const finalTargetInfo = await demos.getAddressInfo(TARGET_ADDRESS);
        const finalTargetBalance = parseFloat(finalTargetInfo?.balance || '0');
        console.log(chalk.green(`🏦 Target balance after: ${finalTargetBalance} DEM`));
        
        // Calculate the actual increase
        const expectedIncrease = totalTransferred;
        console.log(chalk.blue(`📈 Expected increase: ${expectedIncrease.toFixed(4)} DEM`));
        
        if (finalTargetBalance > 15 + expectedIncrease * 0.9) { // Allow some variance
            console.log(chalk.green.bold(`🎉 SUCCESS! Target received tokens!`));
        }
        
    } catch (error) {
        console.log(chalk.yellow(`Could not verify final target balance`));
    }
    
    // Final summary
    console.log(chalk.bold.cyan(`\n📋 FINAL SUMMARY:`));
    console.log(chalk.green(`✅ Successful transfers: ${successCount}/${walletFiles.length}`));
    console.log(chalk.yellow(`💰 Total transferred: ${totalTransferred.toFixed(4)} DEM`));
    console.log(chalk.cyan(`🎯 Target: ${TARGET_ADDRESS}`));
    
    console.log('\n' + '='.repeat(60));
}

main().catch(error => {
    console.error(chalk.red.bold('💥 Fatal error:'), error);
    process.exit(1);
});