#!/usr/bin/env node

/**
 * Demos Faucet Automation CLI
 * Unified command-line interface for wallet creation and faucet requests
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import DemosWalletGenerator from './wallet-generator.js';
import DemosFaucetRequester from './faucet-requester.js';
import { DemosTransfer } from './transfer.js';

const program = new Command();

program
  .name('demos-faucet-automation')
  .description('Automated wallet creation and faucet request tool for Demos Network')
  .version('1.0.0');

// Wallet commands
const walletCmd = program
  .command('wallet')
  .description('Wallet management commands');

walletCmd
  .command('create')
  .description('Create a new wallet')
  .option('-m, --mnemonic <mnemonic>', 'Use specific mnemonic')
  .option('-s, --save', 'Save wallet to file', true)
  .option('-f, --filename <filename>', 'Custom filename for wallet')
  .action(async (options) => {
    const generator = new DemosWalletGenerator();
    
    console.log(chalk.blue('🚀 Creating Demos wallet...\n'));
    
    const wallet = await generator.createWallet(options.mnemonic);
    
    if (wallet.success && options.save) {
      await generator.saveWalletInfo(wallet, options.filename);
    }
  });

walletCmd
  .command('create-multiple')
  .description('Create multiple wallets')
  .option('-c, --count <number>', 'Number of wallets to create', '5')
  .action(async (options) => {
    const generator = new DemosWalletGenerator();
    const count = parseInt(options.count) || 5;
    
    console.log(chalk.blue(`🚀 Creating ${count} Demos wallets...\n`));
    
    await generator.createMultipleWallets(count);
  });

walletCmd
  .command('load')
  .description('Load wallet from file')
  .argument('<file>', 'Wallet file to load')
  .action(async (file) => {
    const generator = new DemosWalletGenerator();
    await generator.loadWalletInfo(file);
  });

// Faucet commands
const faucetCmd = program
  .command('faucet')
  .description('Faucet request commands');

faucetCmd
  .command('status')
  .description('Check faucet status and balance')
  .action(async () => {
    const requester = new DemosFaucetRequester();
    await requester.getFaucetStatus();
  });

faucetCmd
  .command('request')
  .description('Request tokens for an address')
  .argument('<address>', 'Wallet address to request tokens for')
  .option('-r, --retries <number>', 'Number of retry attempts', '3')
  .action(async (address, options) => {
    const requester = new DemosFaucetRequester();
    const retries = parseInt(options.retries) || 3;
    
    await requester.requestTokens(address, retries);
  });

faucetCmd
  .command('request-multiple')
  .description('Request tokens for multiple addresses')
  .argument('<addresses...>', 'Wallet addresses to request tokens for')
  .option('-d, --delay <ms>', 'Delay between requests in milliseconds', '5000')
  .action(async (addresses, options) => {
    const requester = new DemosFaucetRequester();
    const delay = parseInt(options.delay) || 5000;
    
    await requester.requestTokensForMultiple(addresses, delay);
  });

faucetCmd
  .command('request-from-files')
  .description('Request tokens for addresses in wallet files')
  .option('-p, --pattern <pattern>', 'File pattern to match', 'demos-wallet-*.json')
  .action(async (options) => {
    const requester = new DemosFaucetRequester();
    
    await requester.requestFromWalletFiles(options.pattern);
  });

faucetCmd
  .command('check-tx')
  .description('Check transaction status')
  .argument('<txhash>', 'Transaction hash to check')
  .action(async (txhash) => {
    const requester = new DemosFaucetRequester();
    
    await requester.checkTransactionStatus(txhash);
  });

// Transfer commands  
const transferCmd = program
  .command('transfer')
  .description('Transfer tokens between wallets');

transferCmd
  .command('all')
  .description('Transfer all tokens from wallets to destination address')
  .argument('<destination>', 'Destination wallet address')
  .option('-w, --wallets <wallets...>', 'Specific wallet files to transfer from')
  .option('-p, --pattern <pattern>', 'Pattern to match wallet files', 'demos-wallet-*.json')
  .action(async (destination, options) => {
    const transfer = new DemosTransfer();
    
    let walletFiles = options.wallets;
    
    if (!walletFiles) {
      // Auto-discover wallet files
      const fs = await import('fs/promises');
      
      try {
        const files = await fs.readdir('.');
        walletFiles = files.filter(f => f.match(/demos-wallet-.*\.json$/));
      } catch (error) {
        console.log(chalk.red(`❌ Error finding wallet files: ${error.message}`));
        return;
      }
    }
    
    if (walletFiles.length === 0) {
      console.log(chalk.yellow('⚠️  No wallet files found to transfer from'));
      return;
    }
    
    console.log(chalk.blue(`🎯 Transferring from ${walletFiles.length} wallet(s) to: ${destination}`));
    await transfer.transferAllWallets(walletFiles, destination);
  });

transferCmd
  .command('single')
  .description('Transfer tokens from a single wallet')
  .argument('<source>', 'Source wallet file')
  .argument('<destination>', 'Destination wallet address') 
  .action(async (source, destination) => {
    const transfer = new DemosTransfer();
    
    try {
      const wallet = await transfer.loadWallet(source);
      const success = await transfer.transferAll(wallet, destination);
      
      if (success) {
        console.log(chalk.green('✅ Transfer completed successfully'));
      } else {
        console.log(chalk.red('❌ Transfer failed'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
    }
  });

// Automation commands
program
  .command('auto')
  .description('Automated workflow: create wallets and request tokens')
  .option('-c, --count <number>', 'Number of wallets to create', '5')
  .option('-d, --delay <ms>', 'Delay between faucet requests in milliseconds', '10000')
  .option('--skip-faucet', 'Skip automatic faucet requests', false)
  .action(async (options) => {
    const count = parseInt(options.count) || 5;
    const delay = parseInt(options.delay) || 10000;
    
    console.log(chalk.blue(`🤖 Starting automated workflow for ${count} wallets\n`));
    
    // Step 1: Create wallets
    console.log(chalk.yellow('📝 Step 1: Creating wallets...'));
    const generator = new DemosWalletGenerator();
    const wallets = await generator.createMultipleWallets(count);
    
    if (wallets.length === 0) {
      console.error(chalk.red('❌ No wallets created. Aborting.'));
      return;
    }
    
    // Step 2: Request tokens (if not skipped)
    if (!options.skipFaucet) {
      console.log(chalk.yellow('\n💰 Step 2: Requesting tokens from faucet...'));
      
      const requester = new DemosFaucetRequester();
      const addresses = wallets.map(w => w.ed25519Address || w.address);
      
      await requester.requestTokensForMultiple(addresses, delay);
    } else {
      console.log(chalk.yellow('\n⏭️  Skipping faucet requests (--skip-faucet enabled)'));
    }
    
    console.log(chalk.green('\n🎉 Automated workflow completed!'));
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Interactive mode with guided prompts')
  .action(async () => {
    console.log(chalk.blue('🎯 Welcome to Demos Faucet Automation - Interactive Mode\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔐 Create a new wallet', value: 'create-wallet' },
          { name: '🔐 Create multiple wallets', value: 'create-multiple' },
          { name: '💰 Request tokens for an address', value: 'request-tokens' },
          { name: '📂 Request tokens for wallet files', value: 'request-files' },
          { name: '🔄 Transfer all tokens to address', value: 'transfer-all' },
          { name: '🤖 Full automation (create + request)', value: 'automation' },
          { name: '📊 Check faucet status', value: 'faucet-status' }
        ]
      }
    ]);
    
    const generator = new DemosWalletGenerator();
    const requester = new DemosFaucetRequester();
    const transfer = new DemosTransfer();
    
    switch (answers.action) {
      case 'create-wallet':
        const walletAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'mnemonic',
            message: 'Enter mnemonic (leave empty to generate new):',
            default: ''
          },
          {
            type: 'confirm',
            name: 'save',
            message: 'Save wallet to file?',
            default: true
          }
        ]);
        
        const wallet = await generator.createWallet(walletAnswers.mnemonic || null);
        if (wallet.success && walletAnswers.save) {
          await generator.saveWalletInfo(wallet);
        }
        break;
        
      case 'create-multiple':
        const multiAnswers = await inquirer.prompt([
          {
            type: 'number',
            name: 'count',
            message: 'How many wallets to create?',
            default: 5,
            validate: (value) => value > 0 && value <= 50
          }
        ]);
        
        await generator.createMultipleWallets(multiAnswers.count);
        break;
        
      case 'request-tokens':
        const tokenAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'address',
            message: 'Enter wallet address:',
            validate: (value) => value.length > 10 // Basic validation
          }
        ]);
        
        await requester.requestTokens(tokenAnswers.address);
        break;
        
      case 'request-files':
        await requester.requestFromWalletFiles();
        break;
        
      case 'automation':
        const autoAnswers = await inquirer.prompt([
          {
            type: 'number',
            name: 'count',
            message: 'How many wallets to create?',
            default: 5,
            validate: (value) => value > 0 && value <= 20
          },
          {
            type: 'number',
            name: 'delay',
            message: 'Delay between faucet requests (seconds)?',
            default: 10,
            validate: (value) => value >= 5
          }
        ]);
        
        // Run automation
        const autoWallets = await generator.createMultipleWallets(autoAnswers.count);
        if (autoWallets.length > 0) {
          const addresses = autoWallets.map(w => w.ed25519Address || w.address);
          await requester.requestTokensForMultiple(addresses, autoAnswers.delay * 1000);
        }
        break;
        
      case 'transfer-all':
        const transferAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'destination',
            message: 'Enter destination wallet address:',
            validate: (value) => value.length === 66 && value.startsWith('0x') // Basic validation for hex address
          },
          {
            type: 'confirm',
            name: 'confirm',
            message: 'This will transfer ALL tokens from local wallet files. Continue?',
            default: false
          }
        ]);
        
        if (transferAnswers.confirm) {
          // Auto-discover wallet files
          const fs = await import('fs/promises');
          try {
            const files = await fs.readdir('.');
            const walletFiles = files.filter(f => f.match(/demos-wallet-.*\.json$/));
            
            if (walletFiles.length === 0) {
              console.log(chalk.yellow('⚠️  No wallet files found'));
            } else {
              await transfer.transferAllWallets(walletFiles, transferAnswers.destination);
            }
          } catch (error) {
            console.log(chalk.red(`❌ Error: ${error.message}`));
          }
        }
        break;
        
      case 'faucet-status':
        await requester.getFaucetStatus();
        break;
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err) {
  console.error(chalk.red('❌ Error:'), err.message);
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.blue('🎯 Demos Faucet Automation Tool\n'));
  program.outputHelp();
  console.log(chalk.yellow('\n💡 Quick start: Use `demos-faucet-automation interactive` for guided experience'));
  console.log(chalk.green('📖 Examples:'));
  console.log('   demos-faucet-automation wallet create');
  console.log('   demos-faucet-automation faucet status');
  console.log('   demos-faucet-automation auto --count 3');
}