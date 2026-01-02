#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';
const RPC_URL = 'https://node2.demos.sh';

function mnemonicToPrivateKey(mnemonic) {
    try {
        const wallet = ethers.Wallet.fromPhrase(mnemonic);
        return wallet.privateKey;
    } catch (error) {
        console.log(`Error converting mnemonic: ${error.message}`);
        return null;
    }
}

async function performEthersTransfer() {
    console.log('🚀 Using Ethers.js for direct RPC transfers...\n');
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Read wallet files
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    let totalTransferred = 0;
    let successfulTransfers = 0;
    
    // Check target wallet balance before
    console.log('📊 Checking target wallet balance before transfers...');
    try {
        const targetBalance = await provider.getBalance(TARGET_ADDRESS);
        console.log(`Initial target balance: ${ethers.formatEther(targetBalance)} DEM\n`);
    } catch (error) {
        console.log(`Could not check target balance: ${error.message}\n`);
    }
    
    for (const file of walletFiles) {
        console.log(`📂 Processing ${file}...`);
        
        try {
            // Load wallet
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Convert mnemonic to private key
            const privateKey = mnemonicToPrivateKey(walletData.mnemonic);
            if (!privateKey) {
                console.log(`  ❌ Could not derive private key from mnemonic`);
                continue;
            }
            
            // Create wallet instance
            const wallet = new ethers.Wallet(privateKey, provider);
            console.log(`  Address: ${wallet.address}`);
            
            // Check balance
            const balance = await provider.getBalance(wallet.address);
            const balanceInDem = parseFloat(ethers.formatEther(balance));
            
            console.log(`  Balance: ${balanceInDem.toFixed(4)} DEM`);
            
            if (balanceInDem > 0.01) {
                // Calculate amount to send (leave some for gas)
                const gasPrice = await provider.getFeeData();
                const gasLimit = 21000n;
                const gasCost = gasPrice.gasPrice * gasLimit;
                const amountToSend = balance - (gasCost * 2n); // Keep 2x gas for safety
                
                if (amountToSend > 0n) {
                    const amountInDem = parseFloat(ethers.formatEther(amountToSend));
                    console.log(`  💸 Sending ${amountInDem.toFixed(4)} DEM...`);
                    
                    const tx = await wallet.sendTransaction({
                        to: TARGET_ADDRESS,
                        value: amountToSend,
                        gasLimit: gasLimit,
                        gasPrice: gasPrice.gasPrice
                    });
                    
                    console.log(`  📝 Transaction sent: ${tx.hash}`);
                    console.log(`  ⏳ Waiting for confirmation...`);
                    
                    const receipt = await tx.wait();
                    
                    if (receipt.status === 1) {
                        console.log(`  ✅ Transfer successful!`);
                        totalTransferred += amountInDem;
                        successfulTransfers++;
                    } else {
                        console.log(`  ❌ Transfer failed`);
                    }
                } else {
                    console.log(`  ⚠️ Balance too low to cover gas costs`);
                }
            } else {
                console.log(`  ⚠️ Insufficient balance`);
            }
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        
        console.log(''); // Empty line between wallets
    }
    
    // Check target wallet balance after
    console.log('📊 Checking target wallet balance after transfers...');
    try {
        const finalBalance = await provider.getBalance(TARGET_ADDRESS);
        console.log(`Final target balance: ${ethers.formatEther(finalBalance)} DEM`);
    } catch (error) {
        console.log(`Could not check final target balance: ${error.message}`);
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`  Successful transfers: ${successfulTransfers}/${walletFiles.length}`);
    console.log(`  Total transferred: ${totalTransferred.toFixed(4)} DEM`);
    console.log(`  Target address: ${TARGET_ADDRESS}`);
}

performEthersTransfer().catch(console.error);