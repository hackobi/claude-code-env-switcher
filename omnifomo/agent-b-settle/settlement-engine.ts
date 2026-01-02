import { gcr } from '../shared-lib/gcr-client';
import { xmClient } from '../shared-lib/xm-client';
import type { MomentMarket, UserPosition, DAHRAttestation, BetDirection, Chain, GCRDelta } from '../shared-lib/types';
import { fheManager } from './fhe-manager';
import { gasTankManager } from './gas-tank-manager';
import type { 
  SettlementBatch, 
  PositionSettlement, 
  PayoutTransaction,
  SettlementConfig,
  DEFAULT_SETTLEMENT_CONFIG 
} from './types';

class SettlementEngine {
  private batches: Map<string, SettlementBatch> = new Map();
  private payoutTransactions: Map<string, PayoutTransaction> = new Map();
  private config: SettlementConfig;

  constructor(config: Partial<SettlementConfig> = {}) {
    this.config = { 
      fheDecryptionDelay: 1000,
      minPayoutAmount: 1n,
      maxBatchSize: 50,
      retryAttempts: 3,
      retryDelayMs: 5000,
      ...config 
    };
  }

  async processMarketResolution(
    marketId: string,
    attestationId: string
  ): Promise<SettlementBatch | null> {
    console.log(`\n⚙️ Processing market resolution: ${marketId.slice(0, 8)}...`);

    const market = gcr.get<MomentMarket>('MomentMarket', marketId);
    const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);

    if (!market || !attestation) {
      console.error('❌ Market or attestation not found');
      return null;
    }

    const winningDirection: BetDirection = 
      attestation.rawValue >= market.threshold ? 'OVER' : 'UNDER';

    console.log(`🎯 Winning direction: ${winningDirection} (value: ${attestation.rawValue}, threshold: ${market.threshold})`);

    fheManager.authorizeMarketDecryption(marketId);

    await new Promise(resolve => setTimeout(resolve, this.config.fheDecryptionDelay));

    const positions = gcr.query<UserPosition>('UserPosition', p => p.marketId === marketId);
    console.log(`📊 Found ${positions.length} positions to settle`);

    const settlements = await this.calculateSettlements(positions, winningDirection, market);

    const batch = await this.createSettlementBatch(marketId, winningDirection, settlements, market);

    await this.updateMarketStatus(marketId, winningDirection, attestation);

    return batch;
  }

  private async calculateSettlements(
    positions: UserPosition[],
    winningDirection: BetDirection,
    market: MomentMarket
  ): Promise<PositionSettlement[]> {
    const totalPool = market.poolState.totalOverStake + market.poolState.totalUnderStake;
    const winningPool = winningDirection === 'OVER' 
      ? market.poolState.totalOverStake 
      : market.poolState.totalUnderStake;

    const settlements: PositionSettlement[] = [];

    for (const position of positions) {
      const isWinner = position.direction === winningDirection;
      
      let payout: bigint;
      if (isWinner && winningPool > 0n) {
        payout = (position.stakeAmount * totalPool) / winningPool;
      } else {
        payout = 0n;
      }

      settlements.push({
        positionId: position.id,
        userId: position.userId,
        marketId: position.marketId,
        direction: position.direction,
        stakeAmount: position.stakeAmount,
        payout,
        isWinner,
        sourceChain: position.sourceChain,
        depositToken: position.depositToken
      });

      if (isWinner) {
        console.log(`   🎉 Winner: ${position.userId.slice(0, 8)}... → ${payout} USDC`);
      } else {
        console.log(`   💸 Loser: ${position.userId.slice(0, 8)}... lost ${position.stakeAmount} USDC`);
      }
    }

    return settlements;
  }

  private async createSettlementBatch(
    marketId: string,
    winningDirection: BetDirection,
    settlements: PositionSettlement[],
    market: MomentMarket
  ): Promise<SettlementBatch> {
    const batch: SettlementBatch = {
      id: gcr.generateId('batch', marketId, Date.now().toString()),
      marketId,
      winningDirection,
      totalPool: market.poolState.totalOverStake + market.poolState.totalUnderStake,
      winningPool: winningDirection === 'OVER' 
        ? market.poolState.totalOverStake 
        : market.poolState.totalUnderStake,
      losingPool: winningDirection === 'OVER' 
        ? market.poolState.totalUnderStake 
        : market.poolState.totalOverStake,
      positions: settlements,
      status: 'pending',
      createdAt: Date.now()
    };

    this.batches.set(batch.id, batch);

    console.log(`\n📦 Settlement batch created: ${batch.id.slice(0, 8)}...`);
    console.log(`   Total pool: ${batch.totalPool} USDC`);
    console.log(`   Winners: ${settlements.filter(s => s.isWinner).length}`);
    console.log(`   Losers: ${settlements.filter(s => !s.isWinner).length}`);

    return batch;
  }

  async executeSettlementBatch(batchId: string): Promise<boolean> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      console.error(`❌ Batch not found: ${batchId}`);
      return false;
    }

    console.log(`\n💸 Executing settlement batch: ${batchId.slice(0, 8)}...`);
    batch.status = 'processing';
    this.batches.set(batchId, batch);

    const winners = batch.positions.filter(p => p.isWinner && p.payout >= this.config.minPayoutAmount);

    if (winners.length === 0) {
      console.log('⚠️ No winners to pay out');
      batch.status = 'completed';
      batch.completedAt = Date.now();
      this.batches.set(batchId, batch);
      return true;
    }

    const payoutsByChain = this.groupPayoutsByChain(winners);

    for (const [chain, payouts] of payoutsByChain) {
      console.log(`\n🔗 Processing ${payouts.length} payouts on ${chain}...`);
      
      const xmPayouts = payouts.map(p => ({
        address: p.userId,
        amount: p.payout,
        chain: p.sourceChain
      }));

      try {
        const treasuryKey = process.env.TREASURY_PRIVATE_KEY;
        if (treasuryKey) {
          await xmClient.settleBetPayouts(xmPayouts, treasuryKey);
        } else {
          for (const payout of payouts) {
            const tx: PayoutTransaction = {
              id: gcr.generateId('payout', payout.userId, Date.now().toString()),
              batchId,
              recipient: payout.userId,
              amount: payout.payout,
              chain: payout.sourceChain,
              token: payout.depositToken,
              status: 'confirmed',
              txHash: `sim_tx_${Date.now()}`
            };
            this.payoutTransactions.set(tx.id, tx);
            console.log(`   ✅ Simulated payout to ${payout.userId.slice(0, 8)}...`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Payout failed';
        console.error(`   ❌ Payout batch failed: ${message}`);
        batch.error = message;
      }
    }

    batch.status = batch.error ? 'failed' : 'completed';
    batch.completedAt = Date.now();
    this.batches.set(batchId, batch);

    console.log(`\n✅ Settlement batch ${batch.status}: ${batchId.slice(0, 8)}...`);

    return batch.status === 'completed';
  }

  private groupPayoutsByChain(
    settlements: PositionSettlement[]
  ): Map<Chain, PositionSettlement[]> {
    const groups = new Map<Chain, PositionSettlement[]>();

    for (const settlement of settlements) {
      const chain = settlement.sourceChain;
      const existing = groups.get(chain) || [];
      existing.push(settlement);
      groups.set(chain, existing);
    }

    return groups;
  }

  private async updateMarketStatus(
    marketId: string,
    winningDirection: BetDirection,
    attestation: DAHRAttestation
  ): Promise<void> {
    const delta: GCRDelta<MomentMarket> = {
      operation: 'UPDATE',
      entity: 'MomentMarket',
      id: marketId,
      data: {
        status: 'Resolved',
        resolution: {
          finalValue: attestation.rawValue,
          winningDirection,
          attestationHash: attestation.proofHash,
          resolvedAt: Date.now()
        }
      },
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);
  }

  getBatch(batchId: string): SettlementBatch | undefined {
    return this.batches.get(batchId);
  }

  getBatchesForMarket(marketId: string): SettlementBatch[] {
    return Array.from(this.batches.values()).filter(b => b.marketId === marketId);
  }

  getPayoutTransactions(batchId: string): PayoutTransaction[] {
    return Array.from(this.payoutTransactions.values()).filter(t => t.batchId === batchId);
  }

  getStats(): {
    totalBatches: number;
    pendingBatches: number;
    completedBatches: number;
    failedBatches: number;
    totalPayouts: number;
    totalValueSettled: bigint;
  } {
    const batches = Array.from(this.batches.values());
    let totalValueSettled = 0n;

    for (const batch of batches) {
      if (batch.status === 'completed') {
        totalValueSettled += batch.totalPool;
      }
    }

    return {
      totalBatches: batches.length,
      pendingBatches: batches.filter(b => b.status === 'pending').length,
      completedBatches: batches.filter(b => b.status === 'completed').length,
      failedBatches: batches.filter(b => b.status === 'failed').length,
      totalPayouts: this.payoutTransactions.size,
      totalValueSettled
    };
  }
}

export const settlementEngine = new SettlementEngine();
export { SettlementEngine };
