import { Chain } from './types';

interface DepositRecord {
  id: string;
  user: string;
  sourceChain: Chain;
  sourceToken: string;
  sourceAmount: bigint;
  settledAmount: bigint;
  settledToken: string;
}

export class GasTank {
  private deposits: Map<string, DepositRecord> = new Map();
  private balances: Map<string, bigint> = new Map();
  
  private exchangeRates: Record<string, number> = {
    'ETH': 2500,
    'SOL': 150,
    'USDC': 1,
    'USDT': 1,
    'MATIC': 0.5,
  };

  async convert(
    user: string,
    sourceChain: Chain,
    sourceToken: string,
    sourceAmount: bigint
  ): Promise<{ depositId: string; settledAmount: bigint }> {
    const rate = this.exchangeRates[sourceToken] || 1;
    const settledAmount = BigInt(Math.floor(Number(sourceAmount) * rate));
    
    const depositId = `deposit_${user.slice(0, 8)}_${Date.now()}`;
    
    this.deposits.set(depositId, {
      id: depositId,
      user,
      sourceChain,
      sourceToken,
      sourceAmount,
      settledAmount,
      settledToken: 'USDC'
    });

    const balanceKey = `${user}:USDC`;
    const current = this.balances.get(balanceKey) ?? 0n;
    this.balances.set(balanceKey, current + settledAmount);

    console.log(`[GasTank] Converted ${sourceAmount} ${sourceToken} on ${sourceChain} → ${settledAmount} USDC`);
    
    return { depositId, settledAmount };
  }

  async distribute(
    winners: { user: string; amount: bigint; targetChain: Chain; targetToken: string }[]
  ): Promise<void> {
    for (const winner of winners) {
      const rate = this.exchangeRates[winner.targetToken] || 1;
      const targetAmount = BigInt(Math.floor(Number(winner.amount) / rate));
      
      console.log(`[GasTank] Distributing ${targetAmount} ${winner.targetToken} to ${winner.user.slice(0, 8)}... on ${winner.targetChain}`);
    }
  }

  getBalance(user: string, token: string = 'USDC'): bigint {
    return this.balances.get(`${user}:${token}`) ?? 0n;
  }
}

export const gasTank = new GasTank();
