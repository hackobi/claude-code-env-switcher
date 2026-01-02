/**
 * Real Demos Network Transfer Implementation
 * Actual working transfers using proper SDK integration
 */
import { demos } from '@kynesyslabs/demosdk/websdk';
import fs from 'fs/promises';
import chalk from 'chalk';

export class RealDemosTransfer {
  constructor() {
    this.network = 'https://node2.demos.sh';
  }

  /**
   * Load wallet from JSON file
   */
  async loadWallet(walletFile) {
    const walletData = await fs.readFile(walletFile, 'utf8');
    const wallet = JSON.parse(walletData);
    console.log(chalk.blue(`📂 Loading wallet: ${wallet.addresses.primary.substring(0, 20)}...`));
    return wallet;
  }

  /**
   * Perform actual transfer using proper Demos SDK
   */
  async transferTokens(sourceWalletFile, destinationAddress, amount) {
    try {
      console.log(chalk.yellow(`🔄 Starting real transfer...`));
      
      // Load wallet data
      const walletData = await this.loadWallet(sourceWalletFile);
      
      // Connect to Demos network
      console.log(chalk.blue('🌐 Connecting to Demos network...'));
      const connection = await demos.connect(this.network);
      
      // Create wallet instance using mnemonic
      console.log(chalk.blue('🔑 Loading wallet from mnemonic...'));
      const wallet = await connection.wallet.fromMnemonic(walletData.mnemonic);
      
      // Prepare transfer transaction
      console.log(chalk.blue(`💸 Preparing transfer of ${amount} DEM...`));
      const tx = await wallet.transfer(destinationAddress, amount, connection);
      
      // Confirm transaction
      console.log(chalk.blue('✅ Confirming transaction...'));
      const validityData = await connection.confirm(tx);
      
      // Broadcast transaction
      console.log(chalk.blue('📡 Broadcasting transaction...'));
      const result = await wallet.broadcast(validityData, connection);
      
      console.log(chalk.green('✅ Transfer completed successfully!'));
      console.log(chalk.gray(`   From: ${walletData.addresses.primary}`));
      console.log(chalk.gray(`   To: ${destinationAddress}`));
      console.log(chalk.gray(`   Amount: ${amount} DEM`));
      console.log(chalk.gray(`   Result: ${JSON.stringify(result)}`));
      
      return { success: true, result };
      
    } catch (error) {
      console.log(chalk.red(`❌ Transfer failed: ${error.message}`));
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer all tokens from multiple wallets
   */
  async transferAllFromWallets(walletFiles, destinationAddress) {
    console.log(chalk.cyan(`🚀 Starting real batch transfer`));
    console.log(chalk.blue(`🎯 Destination: ${destinationAddress}`));
    console.log(chalk.gray(`📋 Processing ${walletFiles.length} wallet(s)\n`));
    
    let successCount = 0;
    const results = [];
    
    for (let i = 0; i < walletFiles.length; i++) {
      const walletFile = walletFiles[i];
      
      console.log(chalk.blue(`\n📝 Processing wallet ${i + 1}/${walletFiles.length}: ${walletFile}`));
      
      try {
        // Use a reasonable transfer amount (leaving some for gas)
        const transferAmount = 9; // Transfer 9 DEM, keep 1 for gas
        
        const result = await this.transferTokens(walletFile, destinationAddress, transferAmount);
        
        if (result.success) {
          successCount++;
          console.log(chalk.green(`✅ Wallet ${i + 1} transfer successful`));
        } else {
          console.log(chalk.red(`❌ Wallet ${i + 1} transfer failed: ${result.error}`));
        }
        
        results.push(result);
        
        // Wait between transfers
        if (i < walletFiles.length - 1) {
          console.log(chalk.gray(`⏳ Waiting 5 seconds before next transfer...`));
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.log(chalk.red(`❌ Error processing ${walletFile}: ${error.message}`));
        results.push({ success: false, error: error.message });
      }
    }
    
    // Summary
    console.log(chalk.cyan(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan(`📊 REAL TRANSFER RESULTS`));
    console.log(chalk.green(`✅ Successful transfers: ${successCount}/${walletFiles.length}`));
    console.log(chalk.blue(`🎯 Destination: ${destinationAddress}`));
    
    if (successCount > 0) {
      console.log(chalk.green(`💰 Estimated total transferred: ~${successCount * 9} DEM`));
    }
    
    console.log(chalk.cyan(`${'='.repeat(60)}`));
    
    return {
      success: successCount,
      total: walletFiles.length,
      results: results
    };
  }
}

// CLI usage if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const transfer = new RealDemosTransfer();
  
  const destinationAddress = process.argv[2];
  if (!destinationAddress) {
    console.log(chalk.red('❌ Usage: node real-transfer.js <destination_address>'));
    process.exit(1);
  }
  
  // Find wallet files
  const fs_module = await import('fs/promises');
  const files = await fs_module.readdir('.');
  const walletFiles = files.filter(f => f.startsWith('demos-wallet-') && f.endsWith('.json'));
  
  if (walletFiles.length === 0) {
    console.log(chalk.red('❌ No wallet files found'));
    process.exit(1);
  }
  
  console.log(chalk.blue(`🎯 Found ${walletFiles.length} wallet files`));
  await transfer.transferAllFromWallets(walletFiles, destinationAddress);
}