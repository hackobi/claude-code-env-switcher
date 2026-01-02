#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function broadcastTransfer(walletData, amount) {
    try {
        console.log(`\n🔧 Processing ${walletData.address.substring(0, 20)}... (${amount} DEM)`);
        
        // Connect and setup wallet
        await demos.connect('https://node2.demos.sh');
        await demos.connectWallet(walletData.mnemonic);
        
        console.log('   ✅ Connected and wallet loaded');
        
        // Step 1: Prepare transaction using the transactions object
        console.log('   📝 Preparing transaction...');
        const tx = await demos.transactions.transfer(TARGET_ADDRESS, amount);
        console.log('   ✅ Transaction prepared');
        
        // Step 2: Sign the transaction
        console.log('   🔑 Signing transaction...');
        const signedTx = await demos.transactions.sign(tx);
        console.log('   ✅ Transaction signed');
        
        // Step 3: Confirm transaction (gas estimation)
        console.log('   ⚡ Confirming gas fees...');
        const validityData = await demos.transactions.confirm(signedTx);
        console.log('   ✅ Gas confirmed');
        console.log(`   💰 Gas fee: ${JSON.stringify(validityData?.gas || 'N/A')}`);
        
        // Step 4: Broadcast the transaction
        console.log('   📡 Broadcasting transaction...');
        const result = await demos.transactions.broadcast(validityData);
        console.log('   📤 Broadcast result:', result);
        
        if (result && (result.hash || result.transaction_hash)) {
            const hash = result.hash || result.transaction_hash;
            console.log(`   🎉 SUCCESS! Transaction hash: ${hash}`);
            
            // Wait for confirmation
            console.log('   ⏳ Waiting for blockchain confirmation...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Verify the transfer
            const newInfo = await demos.getAddressInfo(walletData.address);
            const newBalance = parseFloat(newInfo?.balance || '0');
            console.log(`   📊 New balance: ${newBalance} DEM`);
            
            return { success: true, hash, newBalance };
        } else {
            console.log('   ❌ No transaction hash in result');
            return { success: false, error: 'No hash in broadcast result' };
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 ATTEMPTING BROADCAST TRANSFERS');
    console.log(`🎯 Target: ${TARGET_ADDRESS}\n`);
    
    // Check initial target balance
    await demos.connect('https://node2.demos.sh');
    const initialTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    console.log(`🏦 Target initial balance: ${initialTarget.balance || '0'} DEM\n`);
    
    // Load one wallet for testing first
    const walletFile = 'batch-wallets/wallet-1.json';
    const walletData = JSON.parse(await fs.readFile(walletFile, 'utf8'));
    
    console.log('🧪 Testing with first wallet only...');
    const result = await broadcastTransfer(walletData, 10); // Test with 10 DEM
    
    if (result.success) {
        console.log('\n✅ Test successful! Proceeding with all wallets...');
        
        // If test works, process all funded wallets
        const walletDir = path.join(__dirname, 'batch-wallets');
        const files = await fs.readdir(walletDir);
        const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
        
        let successCount = 0;
        
        for (const file of walletFiles) {
            try {
                if (file === 'wallet-1.json') continue; // Skip already processed
                
                const filePath = path.join(walletDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                // Check balance first
                await demos.connect('https://node2.demos.sh');
                const info = await demos.getAddressInfo(data.address);
                const balance = parseFloat(info?.balance || '0');
                
                if (balance > 10) {
                    const transferResult = await broadcastTransfer(data, 90); // Send 90, keep 10
                    if (transferResult.success) successCount++;
                    
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait between transfers
                }
            } catch (error) {
                console.log(`❌ ${file}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Final results: ${successCount + 1} successful transfers`);
        
    } else {
        console.log('\n❌ Test failed. Need to debug the broadcast process.');
        console.log(`Error: ${result.error}`);
    }
    
    // Check final target balance
    const finalTarget = await demos.getAddressInfo(TARGET_ADDRESS);
    console.log(`🏦 Target final balance: ${finalTarget.balance || '0'} DEM`);
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});