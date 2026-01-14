#!/usr/bin/env node

import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkRealBalances() {
    console.log('🔍 Checking real wallet balances...\n');
    
    await demos.connect('https://node2.demos.sh');
    
    // Read wallet files
    const walletDir = path.join(__dirname, 'batch-wallets');
    const files = await fs.readdir(walletDir);
    const walletFiles = files.filter(f => f.startsWith('wallet-') && f.endsWith('.json')).sort();
    
    const fundedWallets = [];
    
    for (const file of walletFiles) {
        try {
            const filePath = path.join(walletDir, file);
            const walletData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Try both address formats
            let balance = 0;
            let addressUsed = '';
            
            // Check primary address
            try {
                const primaryInfo = await demos.getAddressInfo(walletData.address);
                balance = parseFloat(primaryInfo?.balance || '0');
                addressUsed = walletData.address;
                
                if (balance === 0 && walletData.ed25519Address) {
                    const ed25519Info = await demos.getAddressInfo(walletData.ed25519Address);
                    const ed25519Balance = parseFloat(ed25519Info?.balance || '0');
                    if (ed25519Balance > 0) {
                        balance = ed25519Balance;
                        addressUsed = walletData.ed25519Address;
                    }
                }
            } catch (error) {
                console.log(`❌ ${file}: Error checking balance - ${error.message}`);
                continue;
            }
            
            console.log(`${balance > 0 ? '💰' : '📱'} ${file}: ${balance} DEM (${addressUsed.substring(0, 20)}...)`);
            
            if (balance > 0) {
                fundedWallets.push({
                    file,
                    balance,
                    address: addressUsed,
                    walletData
                });
            }
            
        } catch (error) {
            console.log(`❌ ${file}: Error reading file - ${error.message}`);
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total wallets: ${walletFiles.length}`);
    console.log(`  Funded wallets: ${fundedWallets.length}`);
    console.log(`  Total balance: ${fundedWallets.reduce((sum, w) => sum + w.balance, 0)} DEM`);
    
    return fundedWallets;
}

// Export for use in other scripts
export { checkRealBalances };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    checkRealBalances().catch(console.error);
}