/**
 * Demos Network Wallet Generator
 * Creates new wallets and displays addresses for faucet requests
 */

import { demos } from '@kynesyslabs/demosdk/websdk';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class DemosWalletGenerator {
  constructor() {
    this.rpcUrl = 'https://node2.demos.sh';
  }

  /**
   * Generate a new 12-word mnemonic
   * Note: This is a simplified version. For production use, implement proper BIP39.
   */
  generateMnemonic() {
    // Extended word list for better randomness
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
      'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
      'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
      'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
      'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
      'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
      'archer', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army',
      'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'article', 'artist',
      'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma',
      'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit',
      'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid',
      'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby',
      'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball', 'bamboo',
      'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base', 'basic',
      'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef',
      'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench',
      'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid',
      'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade',
      'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom'
    ];
    
    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
      // Use crypto.randomBytes for better entropy
      const randomByte = crypto.randomBytes(1)[0];
      const index = randomByte % words.length;
      mnemonic.push(words[index]);
    }
    
    return mnemonic.join(' ');
  }

  /**
   * Create a new wallet and get its address
   */
  async createWallet(providedMnemonic = null) {
    try {
      console.log(chalk.blue('🔗 Connecting to Demos Network...'));
      
      // Connect to the network
      await demos.connect(this.rpcUrl);
      console.log(chalk.green('✅ Connected to Demos Network'));

      // Use provided mnemonic or generate new one
      const mnemonic = providedMnemonic || this.generateMnemonic();
      console.log(chalk.yellow('🔑 Using mnemonic (keep this secure!):'));
      console.log(chalk.cyan(`"${mnemonic}"`));

      // Connect wallet
      console.log(chalk.blue('🔐 Creating wallet...'));
      await demos.connectWallet(mnemonic);

      // Get addresses
      const address = demos.getAddress();
      const ed25519Address = await demos.getEd25519Address();

      console.log(chalk.green('✅ Wallet created successfully!'));
      console.log(chalk.yellow('📍 Addresses:'));
      console.log(`   Primary: ${chalk.cyan(address)}`);
      console.log(`   Ed25519: ${chalk.cyan(ed25519Address)}`);

      // Get initial balance
      try {
        const addressInfo = await demos.getAddressInfo(ed25519Address);
        const balance = addressInfo?.balance || '0';
        console.log(chalk.yellow('💰 Current Balance:'), chalk.green(`${balance} DEM`));
      } catch (error) {
        console.log(chalk.yellow('💰 Current Balance:'), chalk.red('Unable to fetch'));
      }

      return {
        mnemonic,
        address,
        ed25519Address,
        success: true
      };

    } catch (error) {
      console.error(chalk.red('❌ Failed to create wallet:'), error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save wallet info to file
   */
  async saveWalletInfo(walletInfo, filename = null) {
    if (!walletInfo.success) {
      console.error(chalk.red('Cannot save failed wallet creation'));
      return false;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = filename || `demos-wallet-${timestamp}.json`;
      const filePath = path.resolve(fileName);

      const walletData = {
        created: new Date().toISOString(),
        mnemonic: walletInfo.mnemonic,
        addresses: {
          primary: walletInfo.address,
          ed25519: walletInfo.ed25519Address
        },
        network: this.rpcUrl,
        note: "Keep this file secure! The mnemonic gives full access to the wallet."
      };

      await fs.writeFile(filePath, JSON.stringify(walletData, null, 2));
      console.log(chalk.green('💾 Wallet info saved to:'), chalk.cyan(filePath));
      console.log(chalk.yellow('⚠️  Keep this file secure! Delete after use if needed.'));
      
      return filePath;
    } catch (error) {
      console.error(chalk.red('❌ Failed to save wallet info:'), error.message);
      return false;
    }
  }

  /**
   * Load wallet info from file
   */
  async loadWalletInfo(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const walletData = JSON.parse(data);
      
      console.log(chalk.green('📂 Loaded wallet from:'), chalk.cyan(filePath));
      console.log(chalk.yellow('📍 Addresses:'));
      console.log(`   Primary: ${chalk.cyan(walletData.addresses.primary)}`);
      console.log(`   Ed25519: ${chalk.cyan(walletData.addresses.ed25519)}`);
      
      return walletData;
    } catch (error) {
      console.error(chalk.red('❌ Failed to load wallet info:'), error.message);
      return null;
    }
  }

  /**
   * Create multiple wallets for testing
   */
  async createMultipleWallets(count = 5) {
    console.log(chalk.blue(`🔄 Creating ${count} wallets...`));
    const wallets = [];

    for (let i = 1; i <= count; i++) {
      console.log(chalk.yellow(`\n📝 Creating wallet ${i}/${count}:`));
      const wallet = await this.createWallet();
      
      if (wallet.success) {
        wallets.push(wallet);
        // Save each wallet
        await this.saveWalletInfo(wallet, `demos-wallet-${i}.json`);
      }
      
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(chalk.green(`\n✅ Created ${wallets.length}/${count} wallets successfully`));
    return wallets;
  }
}

// CLI usage when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const generator = new DemosWalletGenerator();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.blue('Demos Wallet Generator'));
    console.log(chalk.yellow('Usage:'));
    console.log('  node wallet-generator.js                 - Create single wallet');
    console.log('  node wallet-generator.js --count 5       - Create 5 wallets');
    console.log('  node wallet-generator.js --mnemonic "..." - Use specific mnemonic');
    console.log('  node wallet-generator.js --load file.json - Load existing wallet');
    process.exit(0);
  }

  if (args.includes('--load')) {
    const fileIndex = args.indexOf('--load') + 1;
    const filePath = args[fileIndex];
    if (filePath) {
      generator.loadWalletInfo(filePath);
    } else {
      console.error(chalk.red('Please provide a file path after --load'));
    }
  } else if (args.includes('--count')) {
    const countIndex = args.indexOf('--count') + 1;
    const count = parseInt(args[countIndex]) || 5;
    generator.createMultipleWallets(count);
  } else if (args.includes('--mnemonic')) {
    const mnemonicIndex = args.indexOf('--mnemonic') + 1;
    const mnemonic = args[mnemonicIndex];
    if (mnemonic) {
      generator.createWallet(mnemonic).then(wallet => {
        if (wallet.success) {
          generator.saveWalletInfo(wallet);
        }
      });
    } else {
      console.error(chalk.red('Please provide a mnemonic after --mnemonic'));
    }
  } else {
    // Default: create single wallet
    generator.createWallet().then(wallet => {
      if (wallet.success) {
        generator.saveWalletInfo(wallet);
      }
    });
  }
}

export default DemosWalletGenerator;