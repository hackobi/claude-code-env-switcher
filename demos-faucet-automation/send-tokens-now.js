#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';
const RPC_URL = 'https://node2.demos.sh';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTokensFromWallet(walletData, toAddress) {
    try {
        const mnemonic = walletData.mnemonic;
        const fromAddress = walletData.address || walletData.ed25519Address;
        
        console.log(chalk.blue(`\n🔐 Processing wallet: ${fromAddress}`));
        
        // Connect to network
        await demos.connect(RPC_URL);
        console.log(chalk.green('   ✅ Connected to Demos network'));
        
        // Connect wallet
        await demos.connectWallet(mnemonic);
        console.log(chalk.green('   ✅ Wallet connected'));
        
        // Get balance
        let balance = 0;
        try {
            const ed25519Address = await demos.getEd25519Address();
            const addressInfo = await demos.getAddressInfo(ed25519Address);
            balance = parseFloat(addressInfo?.balance || '0');
            console.log(chalk.yellow(`   💰 Balance: ${balance} DEM`));
        } catch (e) {
            console.log(chalk.red('   ❌ Could not fetch balance'));
            return false;
        }
        
        if (balance <= 0) {
            console.log(chalk.yellow('   ⚠️ No balance to transfer'));
            return false;
        }
        
        // Calculate amount (leave 0.1 DEM for gas)
        const amount = Math.max(0, balance - 0.1);
        if (amount <= 0) {
            console.log(chalk.yellow('   ⚠️ Insufficient balance for transfer'));
            return false;
        }
        
        console.log(chalk.blue(`   💸 Sending ${amount.toFixed(2)} DEM to target...`));
        
        // Use the transfer method
        try {
            const result = await demos.transfer(toAddress, amount);
            console.log(chalk.green(`   ✅ Transfer successful!`));
            if (result && result.hash) {
                console.log(chalk.gray(`   📝 Transaction hash: ${result.hash}`));
            }
            return true;
        } catch (transferError) {
            console.log(chalk.red(`   ❌ Transfer failed: ${transferError.message || transferError}`));
            return false;
        }
        
    } catch (error) {
        console.log(chalk.red(`   ❌ Error: ${error.message}`));
        return false;
    }
}

async function main() {
    console.log(chalk.yellow.bold('\n🚀 SENDING TOKENS TO TARGET ADDRESS'));
    console.log(chalk.cyan(`📍 Target: ${TARGET_ADDRESS}\n`));
    console.log('=' .repeat(70));
    
    // Read wallet files
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    console.log(chalk.blue(`\n📂 Found ${walletFiles.length} wallets\n`));
    
    let successCount = 0;
    let totalSent = 0;
    
    // Process each wallet
    for (let i = 0; i < walletFiles.length; i++) {
        const file = walletFiles[i];
        console.log(chalk.yellow(`\n[${i + 1}/${walletFiles.length}] Processing ${file}...`));
        
        try {
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            const success = await sendTokensFromWallet(walletData, TARGET_ADDRESS);
            
            if (success) {
                successCount++;
                totalSent += 99.9; // Approximate
            }
            
            // Wait between transfers
            if (i < walletFiles.length - 1) {
                console.log(chalk.gray('   ⏳ Waiting 3 seconds...'));
                await delay(3000);
            }
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Failed to process wallet: ${error.message}`));
        }
    }
    
    // Final summary
    console.log('\n' + '=' .repeat(70));
    console.log(chalk.green.bold('\n📊 FINAL RESULTS:'));
    console.log(chalk.green(`✅ Successful transfers: ${successCount}/${walletFiles.length}`));
    if (successCount > 0) {
        console.log(chalk.yellow(`💰 Estimated total sent: ~${(successCount * 99.9).toFixed(2)} DEM`));
    }
    console.log(chalk.cyan(`🎯 All tokens sent to: ${TARGET_ADDRESS}`));
    console.log('\n' + '=' .repeat(70) + '\n');
}

// Execute
main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});