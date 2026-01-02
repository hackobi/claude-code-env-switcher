#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';

const TARGET_ADDRESS = '0xc21217ef413cdb90fa0a8b7a421d2bc3e1fd8cd348b581c8d0976eb4e8962dac';

async function manualBroadcast() {
    console.log('🔧 Testing manual broadcast approach...\n');
    
    // Load wallet-1 for testing
    const walletData = JSON.parse(await fs.readFile('batch-wallets/wallet-1.json', 'utf8'));
    
    console.log('📊 Initial check:');
    await demos.connect('https://node2.demos.sh');
    await demos.connectWallet(walletData.mnemonic);
    
    const initialInfo = await demos.getAddressInfo(walletData.address);
    console.log(`   Wallet balance: ${initialInfo.balance} DEM`);
    
    const targetInitial = await demos.getAddressInfo(TARGET_ADDRESS);
    console.log(`   Target balance: ${targetInitial.balance} DEM`);
    
    console.log('\n🚀 Attempting transfer...');
    
    // Get the transaction object with full details
    const transferResult = await demos.transfer(TARGET_ADDRESS, 5); // Small amount for testing
    
    console.log('📦 Full transaction object:');
    console.log(JSON.stringify(transferResult, null, 2));
    
    // Check if this transaction has a hash and is signed
    if (transferResult && transferResult.content) {
        const content = transferResult.content;
        const hash = transferResult.hash;
        
        console.log(`\n📝 Transaction details:`);
        console.log(`   Hash: ${hash}`);
        console.log(`   From: ${content.from}`);
        console.log(`   To: ${content.to}`);
        console.log(`   Amount: ${content.amount}`);
        console.log(`   Signed: ${transferResult.signature ? 'Yes' : 'No'}`);
        
        if (transferResult.signature) {
            console.log('\n📡 Attempting manual broadcast...');
            
            try {
                // Try using the broadcast method directly
                const broadcastResult = await demos.broadcast(transferResult);
                console.log('📤 Broadcast result:', broadcastResult);
                
                // Wait and check if it worked
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                const finalWalletInfo = await demos.getAddressInfo(walletData.address);
                const finalTargetInfo = await demos.getAddressInfo(TARGET_ADDRESS);
                
                console.log(`\n📊 Final check:`);
                console.log(`   Wallet balance: ${finalWalletInfo.balance} DEM`);
                console.log(`   Target balance: ${finalTargetInfo.balance} DEM`);
                
                const walletChange = parseFloat(initialInfo.balance) - parseFloat(finalWalletInfo.balance);
                const targetChange = parseFloat(finalTargetInfo.balance) - parseFloat(targetInitial.balance);
                
                if (walletChange > 0 || targetChange > 0) {
                    console.log('🎉 TRANSFER SUCCESSFUL!');
                    console.log(`   Wallet decreased by: ${walletChange} DEM`);
                    console.log(`   Target increased by: ${targetChange} DEM`);
                } else {
                    console.log('😞 No balance changes detected');
                }
                
            } catch (broadcastError) {
                console.log(`❌ Broadcast error: ${broadcastError.message}`);
            }
        }
    }
}

manualBroadcast().catch(console.error);