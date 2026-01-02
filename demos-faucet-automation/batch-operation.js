#!/usr/bin/env node

import { DemosWalletGenerator } from './src/wallet-generator.js';
import { DemosFaucetRequester } from './src/faucet-requester.js';
import { ethers } from 'ethers';
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

async function main() {
    console.log('🚀 Starting batch operation...');
    console.log(`📍 Target address: ${TARGET_ADDRESS}`);
    console.log(`👛 Creating ${NUM_WALLETS} wallets...\n`);

    const walletGenerator = new DemosWalletGenerator();
    const faucetRequester = new DemosFaucetRequester();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const wallets = [];
    const walletDir = path.join(__dirname, 'batch-wallets');
    
    // Create directory for wallets
    await fs.mkdir(walletDir, { recursive: true });
    
    // Step 1: Generate 10 wallets
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
    
    // Step 2: Request tokens from faucet for each wallet
    console.log('═══════════════════════════════════════');
    console.log('STEP 2: REQUESTING FAUCET TOKENS');
    console.log('═══════════════════════════════════════\n');
    
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        console.log(`Requesting faucet for wallet ${i + 1}/${NUM_WALLETS}: ${wallet.address}`);
        
        try {
            const result = await faucetRequester.requestTokens(wallet.address);
            
            if (result.success) {
                console.log(`✅ Faucet request successful!`);
                console.log(`   Transaction: ${result.transactionHash}`);
                console.log(`   Amount: ${result.amount} DEMOS`);
            } else {
                console.log(`❌ Faucet request failed: ${result.error}`);
            }
            
            // Wait between requests to avoid rate limiting
            if (i < wallets.length - 1) {
                console.log('   Waiting 5 seconds before next request...\n');
                await delay(5000);
            }
        } catch (error) {
            console.error(`❌ Error requesting faucet: ${error.message}\n`);
        }
    }
    
    // Wait for transactions to be confirmed
    console.log('\n⏳ Waiting 15 seconds for transactions to confirm...\n');
    await delay(15000);
    
    // Step 3: Send all tokens to target address
    console.log('═══════════════════════════════════════');
    console.log('STEP 3: SENDING TOKENS TO TARGET');
    console.log('═══════════════════════════════════════\n');
    
    let totalSent = 0;
    let successfulTransfers = 0;
    
    for (let i = 0; i < wallets.length; i++) {
        const walletData = wallets[i];
        console.log(`\nProcessing wallet ${i + 1}/${NUM_WALLETS}: ${walletData.address}`);
        
        try {
            // Create wallet instance
            const wallet = new ethers.Wallet(walletData.privateKey, provider);
            
            // Check balance
            const balance = await provider.getBalance(wallet.address);
            const balanceInDemos = ethers.formatEther(balance);
            console.log(`   Balance: ${balanceInDemos} DEMOS`);
            
            if (balance > 0n) {
                // Calculate amount to send (leave some for gas)
                const gasPrice = await provider.getFeeData();
                const gasLimit = 21000n;
                const gasCost = gasPrice.gasPrice * gasLimit;
                const amountToSend = balance - (gasCost * 2n); // Keep 2x gas for safety
                
                if (amountToSend > 0n) {
                    console.log(`   Sending ${ethers.formatEther(amountToSend)} DEMOS to target...`);
                    
                    const tx = await wallet.sendTransaction({
                        to: TARGET_ADDRESS,
                        value: amountToSend,
                        gasLimit: gasLimit,
                        gasPrice: gasPrice.gasPrice
                    });
                    
                    console.log(`   Transaction sent: ${tx.hash}`);
                    console.log(`   Waiting for confirmation...`);
                    
                    const receipt = await tx.wait();
                    
                    if (receipt.status === 1) {
                        console.log(`   ✅ Transfer successful!`);
                        totalSent += Number(ethers.formatEther(amountToSend));
                        successfulTransfers++;
                    } else {
                        console.log(`   ❌ Transfer failed`);
                    }
                } else {
                    console.log(`   ⚠️ Balance too low to cover gas costs`);
                }
            } else {
                console.log(`   ⚠️ No balance to transfer`);
            }
            
            // Small delay between transfers
            if (i < wallets.length - 1) {
                await delay(2000);
            }
        } catch (error) {
            console.error(`   ❌ Error transferring: ${error.message}`);
        }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('OPERATION COMPLETE');
    console.log('═══════════════════════════════════════\n');
    console.log(`✅ Successfully created ${NUM_WALLETS} wallets`);
    console.log(`✅ Successfully transferred from ${successfulTransfers} wallets`);
    console.log(`💰 Total amount sent to target: ~${totalSent.toFixed(4)} DEMOS`);
    console.log(`📁 Wallets saved in: ${walletDir}`);
    console.log(`🎯 All tokens sent to: ${TARGET_ADDRESS}`);
}

// Run the script
main().catch(console.error);