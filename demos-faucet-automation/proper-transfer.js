#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function performProperTransfer(walletData, amount) {
    try {
        console.log(chalk.blue(`\n🔐 Processing wallet: ${walletData.address}`));
        
        // Connect to network
        await demos.connect('https://node2.demos.sh');
        console.log(chalk.green('   ✅ Connected to network'));
        
        // Connect wallet with mnemonic
        const publicKey = await demos.connectWallet(walletData.mnemonic);
        console.log(chalk.green('   ✅ Wallet connected'));
        
        // Step 1: Prepare transaction
        console.log(chalk.blue('   📝 Preparing transaction...'));
        const tx = await demos.tx.transfer(TARGET_ADDRESS, amount);
        console.log(chalk.green(`   ✅ Transaction prepared: ${amount} DEM to ${TARGET_ADDRESS.substring(0, 20)}...`));
        
        // Step 2: Sign transaction
        console.log(chalk.blue('   🔑 Signing transaction...'));
        const signedTx = await demos.sign(tx);
        console.log(chalk.green('   ✅ Transaction signed'));
        
        // Step 3: Confirm transaction (gas fee estimation)
        console.log(chalk.blue('   ⚡ Confirming gas fees...'));
        const validityData = await demos.confirm(signedTx);
        console.log(chalk.green('   ✅ Gas fees confirmed'));
        console.log(chalk.gray(`   💰 Gas info: ${JSON.stringify(validityData?.gas || 'N/A')}`));
        
        // Step 4: Broadcast transaction
        console.log(chalk.blue('   📡 Broadcasting transaction...'));
        const result = await demos.broadcast(validityData);
        
        if (result && result.hash) {
            console.log(chalk.green('   ✅ Transaction broadcasted successfully!'));
            console.log(chalk.yellow(`   📝 Transaction hash: ${result.hash}`));
            return { success: true, hash: result.hash, amount };
        } else {
            console.log(chalk.red('   ❌ Broadcast failed - no hash returned'));
            console.log(chalk.gray(`   Response: ${JSON.stringify(result)}`));
            return { success: false, error: 'No transaction hash' };
        }
        
    } catch (error) {
        console.log(chalk.red(`   ❌ Error: ${error.message}`));
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log(chalk.yellow.bold('🚀 PROPER DEMOS SDK TRANSFER'));
    console.log(chalk.cyan(`📍 Target: ${TARGET_ADDRESS}\n`));
    console.log('=' .repeat(70));
    
    // Read wallet files
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    console.log(chalk.blue(`\n📂 Found ${walletFiles.length} wallets`));
    
    // Check target balance before
    try {
        await demos.connect('https://node2.demos.sh');
        const targetInfo = await demos.getAddressInfo(TARGET_ADDRESS);
        console.log(chalk.yellow(`🎯 Target balance before: ${targetInfo.balance || '0'} DEM\n`));
    } catch (error) {
        console.log(chalk.yellow(`🎯 Could not check target balance before: ${error.message}\n`));
    }
    
    let successCount = 0;
    let totalSent = 0;
    const results = [];
    
    // Process each wallet
    for (let i = 0; i < walletFiles.length; i++) {
        const file = walletFiles[i];
        console.log(chalk.yellow(`\n[${i + 1}/${walletFiles.length}] Processing ${file}...`));
        
        try {
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Check balance first
            await demos.connect('https://node2.demos.sh');
            const ed25519Address = walletData.ed25519Address || walletData.address;
            const addressInfo = await demos.getAddressInfo(ed25519Address);
            const balance = parseFloat(addressInfo?.balance || '0');
            
            console.log(chalk.yellow(`   💰 Current balance: ${balance} DEM`));
            
            if (balance > 0.1) {
                const amountToSend = balance - 0.1; // Keep 0.1 for gas
                const result = await performProperTransfer(walletData, amountToSend);
                results.push({ file, ...result });
                
                if (result.success) {
                    successCount++;
                    totalSent += result.amount;
                }
            } else {
                console.log(chalk.yellow('   ⚠️ Insufficient balance for transfer'));
                results.push({ file, success: false, reason: 'Insufficient balance' });
            }
            
            // Wait between transfers
            if (i < walletFiles.length - 1) {
                console.log(chalk.gray('   ⏳ Waiting 3 seconds...'));
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(chalk.red(`   ❌ Failed to process wallet: ${error.message}`));
            results.push({ file, success: false, error: error.message });
        }
    }
    
    // Check target balance after
    console.log('\n' + '=' .repeat(70));
    try {
        await demos.connect('https://node2.demos.sh');
        const finalTargetInfo = await demos.getAddressInfo(TARGET_ADDRESS);
        console.log(chalk.green(`🎯 Target balance after: ${finalTargetInfo.balance || '0'} DEM`));
    } catch (error) {
        console.log(chalk.yellow(`🎯 Could not check target balance after: ${error.message}`));
    }
    
    // Final summary
    console.log(chalk.green.bold('\n📊 TRANSFER RESULTS:'));
    console.log(chalk.green(`✅ Successful transfers: ${successCount}/${walletFiles.length}`));
    console.log(chalk.yellow(`💰 Total sent: ${totalSent.toFixed(4)} DEM`));
    console.log(chalk.cyan(`🎯 Target address: ${TARGET_ADDRESS}`));
    
    console.log('\nDetailed results:');
    results.forEach((r, i) => {
        if (r.success) {
            console.log(chalk.green(`  ✅ ${r.file}: ${r.amount.toFixed(4)} DEM (tx: ${r.hash})`));
        } else {
            console.log(chalk.red(`  ❌ ${r.file}: ${r.reason || r.error}`));
        }
    });
    
    console.log('\n' + '=' .repeat(70) + '\n');
}

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});