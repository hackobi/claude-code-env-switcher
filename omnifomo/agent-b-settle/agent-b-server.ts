import { messageQueue, MESSAGE_TYPES, AgentMessage } from '../shared-lib/message-queue';
import { settlementEngine } from './settlement-engine';
import { fheManager } from './fhe-manager';
import { gasTankManager } from './gas-tank-manager';
import { gcr } from '../shared-lib/gcr-client';
import { xmClient } from '../shared-lib/xm-client';
import type { MomentMarket, UserPosition, DAHRAttestation } from '../shared-lib/types';

interface AgentBConfig {
  redisUrl?: string;
  port: number;
  treasuryKey?: string;
}

const config: AgentBConfig = {
  redisUrl: process.env.REDIS_URL,
  port: parseInt(process.env.AGENT_B_PORT || '3012'),
  treasuryKey: process.env.TREASURY_PRIVATE_KEY
};

class AgentBServer {
  private running = false;
  private cleanups: Array<() => void> = [];
  private pendingSettlements = new Set<string>();

  async start(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('          Agent B: Settlement/Privacy Specialist (Standalone)   ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await messageQueue.connect({
      identity: 'agent-b',
      redisUrl: config.redisUrl
    });

    this.setupMessageHandlers();

    this.running = true;
    console.log(`✅ Agent B server running on port ${config.port}`);
    console.log('📡 Listening for settlement tasks...\n');

    await this.sendHealthResponse();
  }

  private setupMessageHandlers(): void {
    const unsubSettle = messageQueue.on(MESSAGE_TYPES.SETTLE_MARKET, async (msg) => {
      const { marketId, attestationId, value, proofHash } = msg.payload as {
        marketId: string;
        attestationId: string;
        value: string;
        proofHash: string;
      };
      await this.handleSettleMarket(marketId, attestationId, value, proofHash, msg.correlationId);
    });

    const unsubHealth = messageQueue.on(MESSAGE_TYPES.HEALTH_CHECK, async () => {
      await this.sendHealthResponse();
    });

    const unsubShutdown = messageQueue.on(MESSAGE_TYPES.SHUTDOWN, async () => {
      console.log('🛑 Received shutdown signal');
      await this.stop();
    });

    this.cleanups.push(unsubSettle, unsubHealth, unsubShutdown);
  }

  private async handleSettleMarket(
    marketId: string,
    attestationId: string,
    value: string,
    proofHash: string,
    correlationId?: string
  ): Promise<void> {
    if (this.pendingSettlements.has(marketId)) {
      console.log(`⏳ Settlement already in progress for ${marketId.slice(0, 8)}...`);
      return;
    }

    this.pendingSettlements.add(marketId);
    console.log(`\n⚙️ Task: Settle market ${marketId.slice(0, 8)}...`);

    try {
      fheManager.authorizeMarketDecryption(marketId);
      console.log(`   🔓 FHE decryption authorized`);

      await new Promise(resolve => setTimeout(resolve, 500));

      const batch = await settlementEngine.processMarketResolution(marketId, attestationId);

      if (!batch) {
        throw new Error('Failed to create settlement batch');
      }

      console.log(`   📦 Batch created: ${batch.id.slice(0, 8)}...`);
      console.log(`   💰 Total pool: ${batch.totalPool}`);
      console.log(`   🎉 Winners: ${batch.positions.filter(p => p.isWinner).length}`);

      const success = await settlementEngine.executeSettlementBatch(batch.id);

      if (!success) {
        throw new Error(batch.error || 'Settlement execution failed');
      }

      const winners = batch.positions.filter(p => p.isWinner);
      let totalPayout = 0n;
      for (const w of winners) {
        totalPayout += w.payout;
      }

      fheManager.clearMarketData(marketId);

      console.log(`   ✅ Settlement complete`);

      await messageQueue.send('orchestrator', MESSAGE_TYPES.MARKET_SETTLED, {
        marketId,
        batchId: batch.id,
        winningDirection: batch.winningDirection,
        totalPool: batch.totalPool.toString(),
        winnerCount: winners.length,
        totalPayout: totalPayout.toString()
      }, correlationId);

      await messageQueue.broadcast(MESSAGE_TYPES.PAYOUT_COMPLETE, {
        marketId,
        batchId: batch.id,
        recipientCount: winners.length,
        totalAmount: totalPayout.toString(),
        timestamp: Date.now()
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Settlement failed';
      console.error(`   ❌ Settlement failed: ${message}`);

      await messageQueue.send('orchestrator', MESSAGE_TYPES.ERROR, {
        marketId,
        error: message,
        phase: 'settlement'
      }, correlationId);
    } finally {
      this.pendingSettlements.delete(marketId);
    }
  }

  private async sendHealthResponse(): Promise<void> {
    const stats = settlementEngine.getStats();
    const gasTankStats = gasTankManager.getStats();

    await messageQueue.send('orchestrator', MESSAGE_TYPES.HEALTH_RESPONSE, {
      agent: 'agent-b',
      status: 'healthy',
      stats: {
        ...stats,
        totalValueSettled: stats.totalValueSettled.toString(),
        gasTank: {
          ...gasTankStats,
          totalValueLocked: gasTankStats.totalValueLocked.toString()
        },
        pendingSettlements: this.pendingSettlements.size
      },
      timestamp: Date.now()
    });
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Shutting down Agent B...');

    this.cleanups.forEach(fn => fn());
    this.cleanups = [];

    await messageQueue.disconnect();

    this.running = false;
    console.log('✅ Agent B shutdown complete');
    process.exit(0);
  }

  isRunning(): boolean {
    return this.running;
  }
}

const agentBServer = new AgentBServer();

process.on('SIGTERM', () => agentBServer.stop());
process.on('SIGINT', () => agentBServer.stop());

agentBServer.start().catch(error => {
  console.error('❌ Failed to start Agent B:', error);
  process.exit(1);
});

export { AgentBServer, agentBServer };
