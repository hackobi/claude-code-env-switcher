#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function performRealTransfer() {
    console.log('🚀 Starting REAL token transfers...\n');
    
    // Read wallet files
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    let totalTransferred = 0;
    
    for (const file of walletFiles) {
        console.log(`\n📂 Processing ${file}...`);
        
        try {
            // Load wallet
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Connect to network and wallet
            await demos.connect('https://node2.demos.sh');
            await demos.connectWallet(walletData.mnemonic);
            
            const address = demos.getAddress();
            const ed25519Address = await demos.getEd25519Address();
            
            // Check balance
            const addressInfo = await demos.getAddressInfo(ed25519Address);
            const balance = parseFloat(addressInfo?.balance || '0');
            
            console.log(`  Address: ${address}`);
            console.log(`  Balance: ${balance} DEM`);
            
            if (balance > 0.1) {
                const amountToSend = balance - 0.1; // Keep 0.1 for gas
                console.log(`  💸 Attempting to send ${amountToSend} DEM...`);
                
                // The SDK seems to be returning a transaction hash but not actually sending
                // Let's try to use the native operations more directly
                
                // First attempt - using the transfer method with await
                const result = await demos.transfer(TARGET_ADDRESS, amountToSend);
                
                if (result && result.hash) {
                    console.log(`  📝 Got hash: ${result.hash}`);
                    
                    // Wait a moment and check if balance changed
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    const newInfo = await demos.getAddressInfo(ed25519Address);
                    const newBalance = parseFloat(newInfo?.balance || '0');
                    
                    if (newBalance < balance) {
                        console.log(`  ✅ Transfer confirmed! New balance: ${newBalance} DEM`);
                        totalTransferred += amountToSend;
                    } else {
                        console.log(`  ⚠️ Balance unchanged, transfer may be pending`);
                    }
                }
            } else {
                console.log(`  ⚠️ Insufficient balance`);
            }
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }
    
    // Check target wallet balance
    await demos.connect('https://node2.demos.sh');
    const targetInfo = await demos.getAddressInfo(TARGET_ADDRESS);
    console.log(`\n🎯 Target wallet final balance: ${targetInfo.balance} DEM`);
    console.log(`💰 Total attempted transfers: ${totalTransferred.toFixed(2)} DEM`);
}

performRealTransfer().catch(console.error);