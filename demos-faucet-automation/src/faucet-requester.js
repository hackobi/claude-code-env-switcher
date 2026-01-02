/**
 * Demos Network Faucet Requester
 * Automatically requests tokens from the Demos faucet
 */

import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs/promises';

export class DemosFaucetRequester {
  constructor() {
    this.faucetBackendUrl = 'https://faucetbackend.demos.sh';
    this.explorerUrl = 'https://explorer.demos.sh';
  }

  /**
   * Check faucet status and balance
   */
  async getFaucetStatus() {
    try {
      console.log(chalk.blue('📊 Checking faucet status...'));
      
      const response = await axios.get(`${this.faucetBackendUrl}/api/balance`);
      const data = response.data;
      
      // Handle nested response structure
      const balance = data.body?.balance || data.balance;
      const address = data.body?.publicKey || data.address || data.publicKey;
      
      console.log(chalk.green('✅ Faucet Status:'));
      console.log(`   Balance: ${chalk.cyan(balance)} DEM`);
      console.log(`   Address: ${chalk.cyan(address)}`);
      
      return {
        success: true,
        balance: balance,
        address: address
      };
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to get faucet status:'), error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Request tokens from faucet for a given address
   */
  async requestTokens(address, retries = 3) {
    if (!address || typeof address !== 'string') {
      console.error(chalk.red('❌ Invalid address provided'));
      return { success: false, error: 'Invalid address' };
    }

    console.log(chalk.blue(`💰 Requesting tokens for address: ${chalk.cyan(address)}`));

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(chalk.yellow(`🔄 Attempt ${attempt}/${retries}...`));

        const requestBody = {
          address: address.trim(),
          // Add any additional fields the API expects
        };

        const response = await axios.post(
          `${this.faucetBackendUrl}/api/request`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'DemosFaucetBot/1.0'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        if (response.status === 200) {
          const data = response.data;
          console.log(chalk.green('✅ Tokens requested successfully!'));
          
          if (data.txHash) {
            console.log(`   Transaction: ${chalk.cyan(data.txHash)}`);
            console.log(`   Explorer: ${chalk.cyan(`${this.explorerUrl}/transactions/${data.txHash}`)}`);
          }
          
          if (data.amount) {
            console.log(`   Amount: ${chalk.green(data.amount)} DEM`);
          }

          return {
            success: true,
            txHash: data.txHash,
            amount: data.amount,
            explorerUrl: `${this.explorerUrl}/transactions/${data.txHash}`
          };
        }

      } catch (error) {
        console.error(chalk.red(`❌ Attempt ${attempt} failed:`), error.message);
        
        if (error.response) {
          console.log(chalk.yellow('   Response status:'), error.response.status);
          console.log(chalk.yellow('   Response data:'), error.response.data);
          
          // Handle specific error cases
          if (error.response.status === 400) {
            console.log(chalk.yellow('⚠️  Bad request - check address format'));
          } else if (error.response.status === 429) {
            console.log(chalk.yellow('⚠️  Rate limited - waiting before retry...'));
            await this.delay(5000); // Wait 5 seconds on rate limit
          } else if (error.response.status === 500) {
            console.log(chalk.yellow('⚠️  Server error - may be temporary'));
          }
        }

        // Wait between retries
        if (attempt < retries) {
          const waitTime = attempt * 2000; // Exponential backoff
          console.log(chalk.yellow(`⏳ Waiting ${waitTime/1000}s before retry...`));
          await this.delay(waitTime);
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${retries} attempts`
    };
  }

  /**
   * Request tokens for multiple addresses
   */
  async requestTokensForMultiple(addresses, delayBetween = 5000) {
    console.log(chalk.blue(`🔄 Requesting tokens for ${addresses.length} addresses...`));
    
    const results = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      console.log(chalk.yellow(`\n📍 Processing address ${i + 1}/${addresses.length}:`));
      
      const result = await this.requestTokens(address);
      results.push({
        address,
        ...result
      });
      
      // Delay between requests to avoid rate limiting
      if (i < addresses.length - 1) {
        console.log(chalk.yellow(`⏳ Waiting ${delayBetween/1000}s before next request...`));
        await this.delay(delayBetween);
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(chalk.green(`\n✅ Summary: ${successful}/${addresses.length} requests successful`));
    
    return results;
  }

  /**
   * Load addresses from wallet files and request tokens
   */
  async requestFromWalletFiles(filePattern = 'demos-wallet-*.json') {
    try {
      console.log(chalk.blue(`📂 Loading wallet files matching: ${filePattern}`));
      
      // Simple file matching (in production, use glob library)
      const files = await fs.readdir('.');
      const walletFiles = files.filter(f => f.includes('demos-wallet-') && f.endsWith('.json'));
      
      console.log(chalk.yellow(`Found ${walletFiles.length} wallet files`));
      
      const addresses = [];
      for (const file of walletFiles) {
        try {
          const data = await fs.readFile(file, 'utf8');
          const wallet = JSON.parse(data);
          
          // Use ed25519 address if available, otherwise primary
          const address = wallet.addresses?.ed25519 || wallet.addresses?.primary;
          if (address) {
            addresses.push(address);
            console.log(chalk.green(`✅ Loaded address from ${file}: ${address.substring(0, 10)}...`));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Failed to load ${file}:`, error.message));
        }
      }
      
      if (addresses.length > 0) {
        return await this.requestTokensForMultiple(addresses);
      } else {
        console.log(chalk.yellow('⚠️  No valid addresses found in wallet files'));
        return [];
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to process wallet files:'), error.message);
      return [];
    }
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check transaction status on explorer
   */
  async checkTransactionStatus(txHash) {
    try {
      console.log(chalk.blue(`🔍 Checking transaction: ${txHash}`));
      
      // Note: This is a placeholder - actual API endpoint may differ
      const response = await axios.get(`${this.explorerUrl}/api/transactions/${txHash}`);
      
      if (response.status === 200) {
        const data = response.data;
        console.log(chalk.green('✅ Transaction found:'));
        console.log(`   Status: ${chalk.cyan(data.status)}`);
        console.log(`   Block: ${chalk.cyan(data.block)}`);
        return data;
      }
      
    } catch (error) {
      console.log(chalk.yellow('⚠️  Transaction not found or explorer API unavailable'));
      return null;
    }
  }
}

// CLI usage when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const requester = new DemosFaucetRequester();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.blue('Demos Faucet Requester'));
    console.log(chalk.yellow('Usage:'));
    console.log('  node faucet-requester.js --address 0x...     - Request for specific address');
    console.log('  node faucet-requester.js --files             - Request for all wallet files');
    console.log('  node faucet-requester.js --status            - Check faucet status');
    console.log('  node faucet-requester.js --check-tx HASH     - Check transaction status');
    process.exit(0);
  }

  if (args.includes('--status')) {
    requester.getFaucetStatus();
  } else if (args.includes('--address')) {
    const addressIndex = args.indexOf('--address') + 1;
    const address = args[addressIndex];
    if (address) {
      requester.requestTokens(address);
    } else {
      console.error(chalk.red('Please provide an address after --address'));
    }
  } else if (args.includes('--files')) {
    requester.requestFromWalletFiles();
  } else if (args.includes('--check-tx')) {
    const txIndex = args.indexOf('--check-tx') + 1;
    const txHash = args[txIndex];
    if (txHash) {
      requester.checkTransactionStatus(txHash);
    } else {
      console.error(chalk.red('Please provide a transaction hash after --check-tx'));
    }
  } else {
    console.log(chalk.yellow('Use --help for usage information'));
  }
}

export default DemosFaucetRequester;