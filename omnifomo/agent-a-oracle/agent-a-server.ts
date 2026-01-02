import { messageQueue, MESSAGE_TYPES, AgentMessage } from '../shared-lib/message-queue';
import { oracleScheduler } from './scheduler';
import { metricFetcher } from './fetchers';
import { attestationEngine } from './attestation-engine';
import { gcr } from '../shared-lib/gcr-client';
import type { MomentMarket, DAHRAttestation } from '../shared-lib/types';
import type { MetricTarget } from './types';

interface AgentAConfig {
  redisUrl?: string;
  port: number;
}

const config: AgentAConfig = {
  redisUrl: process.env.REDIS_URL,
  port: parseInt(process.env.AGENT_A_PORT || '3011')
};

class AgentAServer {
  private running = false;
  private cleanups: Array<() => void> = [];

  async start(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           Agent A: Oracle/Web2 Specialist (Standalone)         ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await messageQueue.connect({
      identity: 'agent-a',
      redisUrl: config.redisUrl
    });

    await attestationEngine.initialize();

    this.setupMessageHandlers();

    this.running = true;
    console.log(`✅ Agent A server running on port ${config.port}`);
    console.log('📡 Listening for tasks from orchestrator...\n');

    await this.sendHealthResponse();
  }

  private setupMessageHandlers(): void {
    const unsubSchedule = messageQueue.on(MESSAGE_TYPES.SCHEDULE_RESOLUTION, async (msg) => {
      const { market } = msg.payload as { market: MomentMarket };
      await this.handleScheduleResolution(market, msg.correlationId);
    });

    const unsubFetch = messageQueue.on(MESSAGE_TYPES.FETCH_METRIC, async (msg) => {
      const { marketId, target } = msg.payload as { marketId: string; target: MetricTarget };
      await this.handleFetchMetric(marketId, target, msg.correlationId);
    });

    const unsubHealth = messageQueue.on(MESSAGE_TYPES.HEALTH_CHECK, async () => {
      await this.sendHealthResponse();
    });

    const unsubShutdown = messageQueue.on(MESSAGE_TYPES.SHUTDOWN, async () => {
      console.log('🛑 Received shutdown signal');
      await this.stop();
    });

    this.cleanups.push(unsubSchedule, unsubFetch, unsubHealth, unsubShutdown);
  }

  private async handleScheduleResolution(market: MomentMarket, correlationId?: string): Promise<void> {
    console.log(`\n📅 Task: Schedule resolution for market ${market.id.slice(0, 8)}...`);

    const marketWithBigInt: MomentMarket = {
      ...market,
      threshold: BigInt(market.threshold),
      poolState: {
        ...market.poolState,
        totalOverStake: BigInt(market.poolState.totalOverStake),
        totalUnderStake: BigInt(market.poolState.totalUnderStake)
      }
    };

    const fetchId = oracleScheduler.scheduleMarketResolution(marketWithBigInt);

    await messageQueue.send('orchestrator', MESSAGE_TYPES.RESOLUTION_SCHEDULED, {
      marketId: market.id,
      fetchId,
      deadline: market.deadline
    }, correlationId);

    const timeUntilDeadline = (market.deadline * 1000) - Date.now();
    if (timeUntilDeadline > 0) {
      console.log(`   ⏰ Will fetch in ${Math.round(timeUntilDeadline / 1000)}s`);
      setTimeout(() => this.executeScheduledFetch(market.id), timeUntilDeadline);
    } else {
      console.log(`   ⚡ Deadline passed, fetching immediately`);
      await this.executeScheduledFetch(market.id);
    }
  }

  private async executeScheduledFetch(marketId: string): Promise<void> {
    const market = gcr.get<MomentMarket>('MomentMarket', marketId);
    if (!market) {
      console.error(`❌ Market not found: ${marketId}`);
      return;
    }

    const target: MetricTarget = {
      platform: this.contextToPlatform(market.sourceContext),
      sourceId: market.targetMetric.sourceId,
      metricType: market.targetMetric.type as any
    };

    await this.handleFetchMetric(marketId, target);
  }

  private contextToPlatform(context: string): 'X' | 'Farcaster' | 'YouTube' | 'GitHub' {
    const map: Record<string, 'X' | 'Farcaster' | 'YouTube' | 'GitHub'> = {
      'Web2_X': 'X',
      'Web2_Farcaster': 'Farcaster',
      'Web2_YouTube': 'YouTube'
    };
    return map[context] || 'X';
  }

  private async handleFetchMetric(
    marketId: string,
    target: MetricTarget,
    correlationId?: string
  ): Promise<void> {
    console.log(`\n📡 Task: Fetch ${target.platform}/${target.sourceId}`);

    try {
      const result = await metricFetcher.fetch(target);

      if (!result.success) {
        await messageQueue.send('orchestrator', MESSAGE_TYPES.ERROR, {
          marketId,
          error: result.error || 'Fetch failed'
        }, correlationId);
        return;
      }

      console.log(`   ✅ Fetched value: ${result.value}`);

      const proof = await attestationEngine.createAttestation(marketId, result);
      
      if (proof) {
        const attestationId = await attestationEngine.submitToGCR(proof);
        const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);

        console.log(`   🔐 Attestation created: ${attestationId.slice(0, 16)}...`);

        await messageQueue.send('orchestrator', MESSAGE_TYPES.ATTESTATION_CREATED, {
          marketId,
          attestationId,
          value: result.value?.toString(),
          proofHash: attestation?.proofHash
        }, correlationId);

        await messageQueue.send('agent-b', MESSAGE_TYPES.SETTLE_MARKET, {
          marketId,
          attestationId,
          value: result.value?.toString(),
          proofHash: attestation?.proofHash
        }, correlationId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ Fetch failed: ${message}`);
      
      await messageQueue.send('orchestrator', MESSAGE_TYPES.ERROR, {
        marketId,
        error: message
      }, correlationId);
    }
  }

  private async sendHealthResponse(): Promise<void> {
    const fetches = oracleScheduler.getScheduledFetches();

    await messageQueue.send('orchestrator', MESSAGE_TYPES.HEALTH_RESPONSE, {
      agent: 'agent-a',
      status: 'healthy',
      stats: {
        scheduled: fetches.filter(f => f.status === 'scheduled').length,
        completed: fetches.filter(f => f.status === 'completed').length,
        failed: fetches.filter(f => f.status === 'failed').length
      },
      timestamp: Date.now()
    });
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Shutting down Agent A...');
    
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
    
    oracleScheduler.stop();
    await messageQueue.disconnect();
    
    this.running = false;
    console.log('✅ Agent A shutdown complete');
    process.exit(0);
  }

  isRunning(): boolean {
    return this.running;
  }
}

const agentAServer = new AgentAServer();

process.on('SIGTERM', () => agentAServer.stop());
process.on('SIGINT', () => agentAServer.stop());

agentAServer.start().catch(error => {
  console.error('❌ Failed to start Agent A:', error);
  process.exit(1);
});

export { AgentAServer, agentAServer };
