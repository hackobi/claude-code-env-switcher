import type { Chain } from '../shared-lib/types';
import type { GasTankDeposit } from './types';

const EXCHANGE_RATES: Record<string, number> = {
  'ETH': 2500,
  'WETH': 2500,
  'SOL': 150,
  'USDC': 1,
  'USDT': 1,
  'DAI': 1,
  'MATIC': 0.5,
  'ARB': 1.2,
  'OP': 2.0
};

class GasTankManager {
  private deposits: Map<string, GasTankDeposit> = new Map();
  private userBalances: Map<string, bigint> = new Map();
  private chainPools: Map<Chain, bigint> = new Map();

  async deposit(
    userId: string,
    sourceChain: Chain,
    sourceToken: string,
    sourceAmount: bigint
  ): Promise<GasTankDeposit> {
    const rate = EXCHANGE_RATES[sourceToken] || 1;
    const settledAmount = BigInt(Math.floor(Number(sourceAmount) * rate));

    const deposit: GasTankDeposit = {
      id: `deposit_${userId.slice(0, 8)}_${Date.now()}`,
      userId,
      sourceChain,
      sourceToken,
      sourceAmount,
      settledToken: 'USDC',
      settledAmount,
      timestamp: Date.now()
    };

    this.deposits.set(deposit.id, deposit);

    const currentBalance = this.userBalances.get(userId) ?? 0n;
    this.userBalances.set(userId, currentBalance + settledAmount);

    const chainPool = this.chainPools.get(sourceChain) ?? 0n;
    this.chainPools.set(sourceChain, chainPool + sourceAmount);

    console.log(`💰 GasTank Deposit: ${sourceAmount} ${sourceToken} (${sourceChain}) → ${settledAmount} USDC`);

    return deposit;
  }

  async withdraw(
    userId: string,
    amount: bigint,
    targetChain: Chain,
    targetToken: string
  ): Promise<{ success: boolean; targetAmount: bigint; error?: string }> {
    const balance = this.userBalances.get(userId) ?? 0n;

    if (balance < amount) {
      return { success: false, targetAmount: 0n, error: 'Insufficient balance' };
    }

    const rate = EXCHANGE_RATES[targetToken] || 1;
    const targetAmount = BigInt(Math.floor(Number(amount) / rate));

    this.userBalances.set(userId, balance - amount);

    console.log(`💸 GasTank Withdraw: ${amount} USDC → ${targetAmount} ${targetToken} (${targetChain})`);

    return { success: true, targetAmount };
  }

  async batchWithdraw(
    withdrawals: Array<{
      userId: string;
      amount: bigint;
      targetChain: Chain;
      targetToken: string;
    }>
  ): Promise<Array<{ userId: string; success: boolean; targetAmount: bigint; error?: string }>> {
    console.log(`💸 Processing ${withdrawals.length} batch withdrawals...`);

    const results = await Promise.all(
      withdrawals.map(async (w) => ({
        userId: w.userId,
        ...(await this.withdraw(w.userId, w.amount, w.targetChain, w.targetToken))
      }))
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch withdrawals: ${successCount}/${withdrawals.length} successful`);

    return results;
  }

  getBalance(userId: string): bigint {
    return this.userBalances.get(userId) ?? 0n;
  }

  getChainPool(chain: Chain): bigint {
    return this.chainPools.get(chain) ?? 0n;
  }

  getAllChainPools(): Map<Chain, bigint> {
    return new Map(this.chainPools);
  }

  getUserDeposits(userId: string): GasTankDeposit[] {
    return Array.from(this.deposits.values()).filter(d => d.userId === userId);
  }

  getExchangeRate(token: string): number {
    return EXCHANGE_RATES[token] || 1;
  }

  estimateConversion(
    fromToken: string,
    toToken: string,
    amount: bigint
  ): bigint {
    const fromRate = EXCHANGE_RATES[fromToken] || 1;
    const toRate = EXCHANGE_RATES[toToken] || 1;

    const usdcAmount = Number(amount) * fromRate;
    const targetAmount = usdcAmount / toRate;

    return BigInt(Math.floor(targetAmount));
  }

  getStats(): {
    totalDeposits: number;
    totalUsers: number;
    totalValueLocked: bigint;
  } {
    let totalValueLocked = 0n;
    for (const balance of this.userBalances.values()) {
      totalValueLocked += balance;
    }

    return {
      totalDeposits: this.deposits.size,
      totalUsers: this.userBalances.size,
      totalValueLocked
    };
  }
}

export const gasTankManager = new GasTankManager();
export { GasTankManager };
