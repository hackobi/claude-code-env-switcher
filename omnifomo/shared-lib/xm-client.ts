import { demosClient, getDemos } from './demos-client';
import type { Chain } from './types';

let prepareXMPayload: any = null;
let prepareXMScript: any = null;
let EVM: any = null;

async function loadXMDeps() {
  if (!prepareXMPayload) {
    try {
      const sdk = await import('@kynesyslabs/demosdk/websdk');
      prepareXMPayload = sdk.prepareXMPayload;
      prepareXMScript = sdk.prepareXMScript;
      const xmSdk = await import('@kynesyslabs/demosdk/xm-websdk');
      EVM = xmSdk.EVM;
    } catch {
      console.warn('⚠️ XM SDK not available - using mock mode');
      prepareXMPayload = async () => ({ type: 'mock_xm' });
      prepareXMScript = () => ({ type: 'mock_script' });
      EVM = { create: async () => ({ connectWallet: async () => {}, preparePay: async () => ({}) }) };
    }
  }
}

export interface XMChainConfig {
  chain: string;
  subchain: string;
  rpcUrl: string;
}

export const CHAIN_CONFIGS: Record<Chain, XMChainConfig> = {
  Ethereum: { chain: 'eth', subchain: 'mainnet', rpcUrl: 'https://rpc.ankr.com/eth' },
  Base: { chain: 'eth', subchain: 'base', rpcUrl: 'https://mainnet.base.org' },
  Solana: { chain: 'sol', subchain: 'mainnet', rpcUrl: 'https://api.mainnet-beta.solana.com' },
  Arbitrum: { chain: 'eth', subchain: 'arbitrum', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  Polygon: { chain: 'eth', subchain: 'polygon', rpcUrl: 'https://polygon-rpc.com' }
};

export interface CrossChainPayment {
  chain: Chain;
  recipient: string;
  amount: string;
  token?: string;
}

export interface XMTransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

class XMClient {
  private evmInstances: Map<Chain, any> = new Map();

  async getEVMInstance(chain: Chain): Promise<any> {
    await loadXMDeps();
    
    if (!this.evmInstances.has(chain)) {
      const config = CHAIN_CONFIGS[chain];
      if (!config || config.chain !== 'eth') {
        throw new Error(`Chain ${chain} is not an EVM chain`);
      }
      
      const evm = await EVM.create(config.rpcUrl);
      this.evmInstances.set(chain, evm);
    }
    return this.evmInstances.get(chain);
  }

  async preparePayment(payment: CrossChainPayment, privateKey: string): Promise<any> {
    const config = CHAIN_CONFIGS[payment.chain];
    
    if (config.chain === 'eth') {
      const evm = await this.getEVMInstance(payment.chain);
      await evm.connectWallet(privateKey);
      return await evm.preparePay(payment.recipient, payment.amount);
    }
    
    throw new Error(`Chain ${payment.chain} payment preparation not implemented`);
  }

  async executeXMTransaction(
    payments: CrossChainPayment[],
    privateKey: string
  ): Promise<XMTransactionResult> {
    try {
      const signedPayloads: any[] = [];
      
      for (const payment of payments) {
        const payload = await this.preparePayment(payment, privateKey);
        signedPayloads.push(payload);
      }

      const firstPayment = payments[0];
      const config = CHAIN_CONFIGS[firstPayment.chain];

      await loadXMDeps();
      const demos = await getDemos();
      
      const xmscript = prepareXMScript({
        chain: config.chain,
        subchain: config.subchain,
        signedPayloads,
        type: 'pay'
      });

      const tx = await prepareXMPayload(xmscript, demos);
      const validityData = await demosClient.confirm(tx);
      const result = await demosClient.broadcast(validityData);

      console.log(`✅ XM transaction broadcast: ${result.hash || 'pending'}`);

      return {
        success: true,
        txHash: result.hash
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'XM transaction failed';
      console.error(`❌ XM transaction failed: ${message}`);
      
      return {
        success: false,
        error: message
      };
    }
  }

  async settleBetPayouts(
    winners: Array<{
      address: string;
      amount: bigint;
      chain: Chain;
    }>,
    treasuryKey: string
  ): Promise<XMTransactionResult[]> {
    const results: XMTransactionResult[] = [];

    const paymentsByChain = new Map<Chain, CrossChainPayment[]>();
    
    for (const winner of winners) {
      const payments = paymentsByChain.get(winner.chain) || [];
      payments.push({
        chain: winner.chain,
        recipient: winner.address,
        amount: winner.amount.toString()
      });
      paymentsByChain.set(winner.chain, payments);
    }

    for (const [chain, payments] of paymentsByChain) {
      console.log(`💸 Settling ${payments.length} payouts on ${chain}`);
      const result = await this.executeXMTransaction(payments, treasuryKey);
      results.push(result);
    }

    return results;
  }

  reset(): void {
    this.evmInstances.clear();
  }
}

export const xmClient = new XMClient();
