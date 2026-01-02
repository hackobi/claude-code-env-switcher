#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function transferTokens(mnemonic, toAddress) {
    try {
        // Connect to Demos network
        const demosInstance = demos({
            protocol: "standard",
            host: 'https://run.mockmyid.com/',
            signatureConfig: {
                signer: "kyneys"
            },
            mnemonicData: mnemonic
        });

        await demosInstance.demosinit();

        // Get wallet address and balance
        const address = demosInstance.wallet.evmAddress;
        const balance = await demosInstance.wallet.getBalance();
        const balanceNum = parseFloat(balance);

        console.log(`   Wallet: ${address}`);
        console.log(`   Balance: ${balanceNum} DEMOS`);

        if (balanceNum <= 0) {
            console.log('   ⚠️ No balance to transfer');
            return { success: false, reason: 'No balance' };
        }

        // Calculate amount to send (leave 0.01 DEMOS for gas)
        const gasReserve = 0.01;
        const amountToSend = Math.max(0, balanceNum - gasReserve);

        if (amountToSend <= 0) {
            console.log('   ⚠️ Balance too low to transfer (need gas reserve)');
            return { success: false, reason: 'Insufficient balance' };
        }

        console.log(`   Sending ${amountToSend.toFixed(4)} DEMOS to ${toAddress}...`);

        // Send transaction
        const tx = await demosInstance.wallet.sendTransaction({
            to: toAddress,
            amount: amountToSend.toString()
        });

        console.log(`   ✅ Transaction sent: ${tx.hash}`);

        return {
            success: true,
            txHash: tx.hash,
            amount: amountToSend
        };
    } catch (error) {
        console.error(`   ❌ Transfer error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 Transferring tokens from existing wallets...');
    console.log(`📍 Target address: ${TARGET_ADDRESS}\n`);

    const walletDir = path.join(__dirname, 'batch-wallets');
    
    // Read all wallet files
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json'));
    
    console.log(`Found ${walletFiles.length} wallets to process\n`);
    
    console.log('═══════════════════════════════════════');
    console.log('TRANSFERRING TOKENS');
    console.log('═══════════════════════════════════════\n');
    
    let totalSent = 0;
    let successfulTransfers = 0;
    
    for (let i = 0; i < walletFiles.length; i++) {
        const file = walletFiles[i];
        const filePath = path.join(walletDir, file);
        const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        console.log(`\n[${i + 1}/${walletFiles.length}] Processing ${file}`);
        
        const result = await transferTokens(walletData.mnemonic, TARGET_ADDRESS);
        
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
    console.log('TRANSFER COMPLETE');
    console.log('═══════════════════════════════════════\n');
    console.log(`✅ Successfully transferred from ${successfulTransfers}/${walletFiles.length} wallets`);
    console.log(`💰 Total amount sent: ~${totalSent.toFixed(4)} DEMOS`);
    console.log(`🎯 All tokens sent to: ${TARGET_ADDRESS}`);
}

// Run the script
main().catch(console.error);