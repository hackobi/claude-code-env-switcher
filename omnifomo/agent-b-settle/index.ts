export { FHEManager, fheManager } from './fhe-manager';
export { GasTankManager, gasTankManager } from './gas-tank-manager';
export { SettlementEngine, settlementEngine } from './settlement-engine';
export * from './types';

import { settlementEngine } from './settlement-engine';
import { fheManager } from './fhe-manager';
import { gasTankManager } from './gas-tank-manager';
import { gcr } from '../shared-lib/gcr-client';
import { eventBus } from '../shared-lib/event-bus';
import type { MomentMarket, UserPosition, Chain, BetDirection, GCRDelta } from '../shared-lib/types';
import type { SettlementConfig } from './types';

export class AgentBSettlement {
  private config: Partial<SettlementConfig>;
  private initialized = false;
  private eventCleanups: Array<() => void> = [];

  constructor(config: Partial<SettlementConfig> = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('            Agent B: Settlement/Privacy Specialist              ');
    console.log('═══════════════════════════════════════════════════════════════');

    this.setupEventListeners();

    this.initialized = true;
    console.log('✅ Agent B initialized and ready');
  }

  private setupEventListeners(): void {
    const unsubBetPlaced = eventBus.on('bet_placed', (event) => {
      fheManager.encrypt(event.amount, `position_${event.marketId}_${event.userId}`);
    });

    const unsubResolution = eventBus.on('resolution_complete', async (event) => {
      const batch = settlementEngine.getBatchesForMarket(event.marketId)[0];
      if (batch) {
        const winners = batch.positions.filter(p => p.isWinner);
        let totalPayout = 0n;
        for (const w of winners) {
          totalPayout += w.payout;
        }

        eventBus.emit('payout_sent', {
          batchId: batch.id,
          marketId: event.marketId,
          recipientCount: winners.length,
          totalAmount: totalPayout
        });
      }
    });

    this.eventCleanups.push(unsubBetPlaced, unsubResolution);
  }

  async shutdown(): Promise<void> {
    this.eventCleanups.forEach(fn => fn());
    this.eventCleanups = [];
    this.initialized = false;
    console.log('🛑 Agent B shutdown complete');
  }

  async processDeposit(
    userId: string,
    amount: bigint,
    sourceChain: Chain,
    token: string
  ): Promise<{ depositId: string; settledAmount: bigint }> {
    console.log(`\n💰 Processing deposit: ${amount} ${token} from ${sourceChain}`);

    const deposit = await gasTankManager.deposit(userId, sourceChain, token, amount);

    const encrypted = fheManager.encrypt(deposit.settledAmount, `deposit_${deposit.id}`);
    console.log(`🔐 Deposit encrypted: ${encrypted.ciphertext.slice(0, 20)}...`);

    return {
      depositId: deposit.id,
      settledAmount: deposit.settledAmount
    };
  }

  async placeBetWithFHE(
    marketId: string,
    userId: string,
    direction: BetDirection,
    amount: bigint,
    sourceChain: Chain,
    depositToken: string
  ): Promise<string> {
    const encrypted = fheManager.encrypt(amount, `position_${marketId}_${userId}`);

    const positionId = gcr.generateId(userId, marketId);

    const position: UserPosition = {
      id: positionId,
      userId,
      marketId,
      stakeAmount: amount,
      direction,
      sourceChain,
      depositToken,
      createdAt: Date.now(),
      claimed: false
    };

    const delta: GCRDelta<UserPosition> = {
      operation: 'CREATE',
      entity: 'UserPosition',
      id: positionId,
      data: position,
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);

    console.log(`🔐 Bet placed with FHE encryption: ${positionId.slice(0, 8)}...`);
    console.log(`   Encrypted stake: ${encrypted.ciphertext.slice(0, 20)}...`);

    return positionId;
  }

  async settleMarket(
    marketId: string,
    attestationId: string
  ): Promise<{ success: boolean; batchId?: string; error?: string }> {
    console.log(`\n⚙️ Settling market: ${marketId.slice(0, 8)}...`);

    try {
      const batch = await settlementEngine.processMarketResolution(marketId, attestationId);

      if (!batch) {
        eventBus.emit('error', {
          source: 'agent-b:settlement',
          error: new Error('Failed to create settlement batch')
        });
        return { success: false, error: 'Failed to create settlement batch' };
      }

      const success = await settlementEngine.executeSettlementBatch(batch.id);

      if (!success) {
        eventBus.emit('error', {
          source: 'agent-b:settlement',
          error: new Error(batch.error || 'Settlement execution failed')
        });
        return { success: false, batchId: batch.id, error: batch.error };
      }

      fheManager.clearMarketData(marketId);

      return { success: true, batchId: batch.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Settlement failed';
      eventBus.emit('error', {
        source: 'agent-b:settlement',
        error: error instanceof Error ? error : new Error(message)
      });
      return { success: false, error: message };
    }
  }

  async claimWinnings(
    positionId: string
  ): Promise<{ success: boolean; amount?: bigint; txHash?: string; error?: string }> {
    const position = gcr.get<UserPosition>('UserPosition', positionId);

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    if (position.claimed) {
      return { success: false, error: 'Already claimed' };
    }

    const market = gcr.get<MomentMarket>('MomentMarket', position.marketId);
    if (!market || market.status !== 'Resolved') {
      return { success: false, error: 'Market not resolved' };
    }

    if (market.resolution?.winningDirection !== position.direction) {
      return { success: false, error: 'Position did not win' };
    }

    const totalPool = market.poolState.totalOverStake + market.poolState.totalUnderStake;
    const winningPool = market.resolution.winningDirection === 'OVER'
      ? market.poolState.totalOverStake
      : market.poolState.totalUnderStake;

    const payout = (position.stakeAmount * totalPool) / winningPool;

    const updateDelta: GCRDelta<UserPosition> = {
      operation: 'UPDATE',
      entity: 'UserPosition',
      id: positionId,
      data: { claimed: true },
      timestamp: Date.now()
    };
    gcr.applyDelta(updateDelta);

    console.log(`💰 Winnings claimed: ${payout} USDC for ${position.userId.slice(0, 8)}...`);

    return {
      success: true,
      amount: payout,
      txHash: `claim_${Date.now()}`
    };
  }

  getStatus(): {
    initialized: boolean;
    gasTankStats: ReturnType<typeof gasTankManager.getStats>;
    settlementStats: ReturnType<typeof settlementEngine.getStats>;
  } {
    return {
      initialized: this.initialized,
      gasTankStats: gasTankManager.getStats(),
      settlementStats: settlementEngine.getStats()
    };
  }
}

export const agentB = new AgentBSettlement();

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('\n🧪 Agent B Demo Mode\n');

    await agentB.initialize();

    const deposit1 = await agentB.processDeposit(
      '0xAlice123',
      100n,
      'Ethereum',
      'ETH'
    );
    console.log('Deposit result:', deposit1);

    const deposit2 = await agentB.processDeposit(
      '0xBob456',
      500n,
      'Base',
      'USDC'
    );
    console.log('Deposit result:', deposit2);

    console.log('\n📊 Agent B Status:', agentB.getStatus());

    agentB.shutdown();
  })();
}
