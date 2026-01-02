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

async function transferTokens(mnemonic, toAddress) {
    try {
        // Connect to Demos network
        console.log(chalk.blue('   Connecting to network...'));
        await demos.connect(RPC_URL);
        
        // Connect wallet with mnemonic
        await demos.connectWallet(mnemonic);
        
        // Get wallet address and balance
        const address = demos.getAddress();
        const ed25519Address = await demos.getEd25519Address();
        
        console.log(chalk.cyan(`   Wallet: ${address}`));
        
        // Try to get balance
        let balanceNum = 0;
        try {
            const addressInfo = await demos.getAddressInfo(ed25519Address);
            balanceNum = parseFloat(addressInfo?.balance || '0');
            console.log(chalk.green(`   Balance: ${balanceNum} DEM`));
        } catch (error) {
            console.log(chalk.yellow(`   Could not fetch balance`));
            return { success: false, reason: 'Cannot fetch balance' };
        }

        if (balanceNum <= 0) {
            console.log(chalk.yellow('   ⚠️ No balance to transfer'));
            return { success: false, reason: 'No balance' };
        }

        // Calculate amount to send (leave 0.01 DEM for gas)
        const gasReserve = 0.01;
        const amountToSend = Math.max(0, balanceNum - gasReserve);

        if (amountToSend <= 0) {
            console.log(chalk.yellow('   ⚠️ Balance too low to transfer (need gas reserve)'));
            return { success: false, reason: 'Insufficient balance' };
        }

        console.log(chalk.blue(`   Sending ${amountToSend.toFixed(4)} DEM to target...`));

        // Perform transfer
        const transferResult = await demos.transfer(toAddress, amountToSend);
        
        if (transferResult.success) {
            console.log(chalk.green(`   ✅ Transaction sent: ${transferResult.hash}`));
            return {
                success: true,
                txHash: transferResult.hash,
                amount: amountToSend
            };
        } else {
            console.log(chalk.red(`   ❌ Transfer failed: ${transferResult.error}`));
            return { success: false, error: transferResult.error };
        }
    } catch (error) {
        console.error(chalk.red(`   ❌ Transfer error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log(chalk.yellow('🚀 Transferring tokens from existing wallets...'));
    console.log(chalk.cyan(`📍 Target address: ${TARGET_ADDRESS}\n`));

    const walletDir = path.join(__dirname, 'batch-wallets');
    
    // Read all wallet files
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    console.log(chalk.blue(`Found ${walletFiles.length} wallets to process\n`));
    
    console.log('═══════════════════════════════════════');
    console.log(chalk.green('TRANSFERRING TOKENS'));
    console.log('═══════════════════════════════════════\n');
    
    let totalSent = 0;
    let successfulTransfers = 0;
    const results = [];
    
    for (let i = 0; i < walletFiles.length; i++) {
        const file = walletFiles[i];
        const filePath = path.join(walletDir, file);
        const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        console.log(chalk.yellow(`\n[${i + 1}/${walletFiles.length}] Processing ${file}`));
        
        const result = await transferTokens(walletData.mnemonic, TARGET_ADDRESS);
        results.push({ wallet: file, ...result });
        
        if (result.success) {
            successfulTransfers++;
            totalSent += result.amount;
        }
        
        // Small delay between transfers
        if (i < walletFiles.length - 1) {
            await delay(3000);
        }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log(chalk.green('TRANSFER COMPLETE'));
    console.log('═══════════════════════════════════════\n');
    console.log(chalk.green(`✅ Successfully transferred from ${successfulTransfers}/${walletFiles.length} wallets`));
    console.log(chalk.yellow(`💰 Total amount sent: ~${totalSent.toFixed(4)} DEM`));
    console.log(chalk.cyan(`🎯 All tokens sent to: ${TARGET_ADDRESS}`));
    
    // Show details
    console.log('\nTransfer details:');
    results.forEach((r, i) => {
        if (r.success) {
            console.log(chalk.green(`  ✅ ${r.wallet}: ${r.amount.toFixed(4)} DEM (tx: ${r.txHash})`));
        } else {
            console.log(chalk.red(`  ❌ ${r.wallet}: ${r.reason || r.error}`));
        }
    });
}

// Run the script
main().catch(console.error);