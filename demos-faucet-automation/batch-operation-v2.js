#!/usr/bin/env node

import { DemosWalletGenerator } from './src/wallet-generator.js';
import { DemosFaucetRequester } from './src/faucet-requester.js';
import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';
const NUM_WALLETS = 10;
const RPC_URL = 'https://run.mockmyid.com/';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function transferTokens(mnemonic, toAddress, amount = null) {
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
        const amountToSend = amount || Math.max(0, balanceNum - gasReserve);

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
        console.log(`   Waiting for confirmation...`);

        // Wait for confirmation
        await delay(3000);

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
    console.log('🚀 Starting batch operation...');
    console.log(`📍 Target address: ${TARGET_ADDRESS}`);
    console.log(`👛 Creating ${NUM_WALLETS} wallets...\n`);

    const walletGenerator = new DemosWalletGenerator();
    const faucetRequester = new DemosFaucetRequester();
    
    const wallets = [];
    const walletDir = path.join(__dirname, 'batch-wallets');
    
    // Create directory for wallets
    await fs.mkdir(walletDir, { recursive: true });
    
    // Step 1: Generate wallets
    console.log('═══════════════════════════════════════');
    console.log('STEP 1: GENERATING WALLETS');
    console.log('═══════════════════════════════════════\n');
    
    for (let i = 1; i <= NUM_WALLETS; i++) {
        console.log(`Creating wallet ${i}/${NUM_WALLETS}...`);
        const walletData = await walletGenerator.createWallet();
        wallets.push(walletData);
        
        // Save wallet to file
        const fileName = path.join(walletDir, `wallet-${i}.json`);
        await fs.writeFile(fileName, JSON.stringify(walletData, null, 2));
        console.log(`✅ Wallet ${i} created: ${walletData.address}`);
        console.log(`   Saved to: ${fileName}\n`);
    }
    
    // Step 2: Request tokens from faucet
    console.log('═══════════════════════════════════════');
    console.log('STEP 2: REQUESTING FAUCET TOKENS');
    console.log('═══════════════════════════════════════\n');
    
    const successfulFaucets = [];
    
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        console.log(`\n[${i + 1}/${NUM_WALLETS}] Requesting faucet for: ${wallet.address}`);
        
        try {
            const result = await faucetRequester.requestTokens(wallet.address);
            
            if (result.success) {
                console.log(`✅ Faucet request successful!`);
                successfulFaucets.push(i);
            } else {
                console.log(`❌ Faucet request failed: ${result.error}`);
            }
            
            // Longer wait between requests to avoid rate limiting
            if (i < wallets.length - 1) {
                console.log('⏳ Waiting 10 seconds before next request...');
                await delay(10000);
            }
        } catch (error) {
            console.error(`❌ Error requesting faucet: ${error.message}`);
        }
    }
    
    // Wait for transactions to be confirmed
    console.log('\n⏳ Waiting 20 seconds for transactions to confirm...\n');
    await delay(20000);
    
    // Step 3: Send all tokens to target address
    console.log('═══════════════════════════════════════');
    console.log('STEP 3: SENDING TOKENS TO TARGET');
    console.log('═══════════════════════════════════════\n');
    
    let totalSent = 0;
    let successfulTransfers = 0;
    
    for (let i = 0; i < wallets.length; i++) {
        if (!successfulFaucets.includes(i)) {
            console.log(`\n[${i + 1}/${NUM_WALLETS}] Skipping wallet (no faucet tokens): ${wallets[i].address}`);
            continue;
        }
        
        const walletData = wallets[i];
        console.log(`\n[${i + 1}/${NUM_WALLETS}] Processing wallet: ${walletData.address}`);
        
        const result = await transferTokens(walletData.mnemonic, TARGET_ADDRESS);
        
        if (result.success) {
            successfulTransfers++;
            totalSent += result.amount;
        }
        
        // Small delay between transfers
        if (i < wallets.length - 1) {
            await delay(3000);
        }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('OPERATION COMPLETE');
    console.log('═══════════════════════════════════════\n');
    console.log(`✅ Successfully created ${NUM_WALLETS} wallets`);
    console.log(`✅ Faucet requests successful: ${successfulFaucets.length}/${NUM_WALLETS}`);
    console.log(`✅ Successfully transferred from ${successfulTransfers} wallets`);
    console.log(`💰 Total amount sent to target: ~${totalSent.toFixed(4)} DEMOS`);
    console.log(`📁 Wallets saved in: ${walletDir}`);
    console.log(`🎯 All tokens sent to: ${TARGET_ADDRESS}`);
}

// Run the script
main().catch(console.error);