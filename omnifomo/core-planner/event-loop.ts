import { gcr } from '../shared-lib/gcr-client';
import { eventBus } from '../shared-lib/event-bus';
import type { MomentMarket, DAHRAttestation } from '../shared-lib/types';
import { agentA } from '../agent-a-oracle';
import { agentB } from '../agent-b-settle';

export type LoopStatus = 'stopped' | 'starting' | 'running' | 'stopping';

export interface EventLoopConfig {
  pollIntervalMs: number;
  deadlineBufferMs: number;
  autoSettleEnabled: boolean;
  maxConcurrentSettlements: number;
}

const DEFAULT_CONFIG: EventLoopConfig = {
  pollIntervalMs: 5000,
  deadlineBufferMs: 2000,
  autoSettleEnabled: true,
  maxConcurrentSettlements: 5
};

class OmniFOMOEventLoop {
  private config: EventLoopConfig;
  private status: LoopStatus = 'stopped';
  private pollInterval: NodeJS.Timeout | null = null;
  private pendingSettlements = new Set<string>();
  private cleanupFns: Array<() => void> = [];

  constructor(config: Partial<EventLoopConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.status === 'running') {
      console.log('⚠️ Event loop already running');
      return;
    }

    this.status = 'starting';
    console.log('🔄 Starting OmniFOMO event loop...');

    await agentA.initialize();
    await agentB.initialize();

    this.setupEventHandlers();

    this.pollInterval = setInterval(() => this.poll(), this.config.pollIntervalMs);

    this.status = 'running';
    console.log(`✅ Event loop running (poll: ${this.config.pollIntervalMs}ms)`);
  }

  async stop(): Promise<void> {
    if (this.status === 'stopped') return;

    this.status = 'stopping';
    console.log('🛑 Stopping event loop...');

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];

    await agentA.shutdown();
    await agentB.shutdown();

    eventBus.emit('shutdown', { reason: 'graceful' });

    this.status = 'stopped';
    console.log('✅ Event loop stopped');
  }

  getStatus(): LoopStatus {
    return this.status;
  }

  private setupEventHandlers(): void {
    const unsubMarketCreated = eventBus.on('market_created', (event) => {
      console.log(`📅 Scheduling resolution for market ${event.market.id.slice(0, 8)}...`);
      agentA.scheduleResolution(event.market);
    });

    const unsubAttestationReady = eventBus.on('attestation_ready', async (event) => {
      if (!this.config.autoSettleEnabled) return;
      if (this.pendingSettlements.has(event.marketId)) return;

      if (this.pendingSettlements.size >= this.config.maxConcurrentSettlements) {
        console.log(`⏳ Settlement queue full, waiting...`);
        return;
      }

      this.pendingSettlements.add(event.marketId);

      try {
        console.log(`⚙️ Auto-settling market ${event.marketId.slice(0, 8)}...`);
        const result = await agentB.settleMarket(event.marketId, event.attestationId);

        if (result.success) {
          eventBus.emit('resolution_complete', {
            marketId: event.marketId,
            winningDirection: this.getWinningDirection(event.marketId),
            finalValue: event.value,
            attestationHash: event.proofHash
          });
        }
      } catch (error) {
        eventBus.emit('error', {
          source: 'event-loop:settlement',
          error: error instanceof Error ? error : new Error(String(error))
        });
      } finally {
        this.pendingSettlements.delete(event.marketId);
      }
    });

    const unsubError = eventBus.on('error', (event) => {
      console.error(`❌ [${event.source}] ${event.error.message}`);
    });

    this.cleanupFns.push(unsubMarketCreated, unsubAttestationReady, unsubError);
  }

  private async poll(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const openMarkets = gcr.query<MomentMarket>('MomentMarket', m => m.status === 'Open');

    for (const market of openMarkets) {
      const timeUntilDeadline = (market.deadline * 1000) - Date.now();

      if (timeUntilDeadline <= 0 && timeUntilDeadline > -this.config.deadlineBufferMs) {
        eventBus.emit('deadline_reached', {
          marketId: market.id,
          deadline: market.deadline
        });
      }
    }

    const unresolvedAttestations = gcr.query<DAHRAttestation>(
      'DAHRAttestation',
      a => a.status === 'Verified'
    );

    for (const attestation of unresolvedAttestations) {
      const market = gcr.get<MomentMarket>('MomentMarket', attestation.marketId);
      
      if (market && market.status === 'Open' && !this.pendingSettlements.has(market.id)) {
        eventBus.emit('attestation_ready', {
          marketId: attestation.marketId,
          attestationId: attestation.id,
          value: attestation.rawValue,
          proofHash: attestation.proofHash
        });
      }
    }
  }

  private getWinningDirection(marketId: string): 'OVER' | 'UNDER' {
    const market = gcr.get<MomentMarket>('MomentMarket', marketId);
    return market?.resolution?.winningDirection || 'OVER';
  }

  getStats(): {
    status: LoopStatus;
    pendingSettlements: number;
    openMarkets: number;
    resolvedMarkets: number;
    eventHistory: number;
  } {
    const markets = gcr.query<MomentMarket>('MomentMarket', () => true);

    return {
      status: this.status,
      pendingSettlements: this.pendingSettlements.size,
      openMarkets: markets.filter(m => m.status === 'Open').length,
      resolvedMarkets: markets.filter(m => m.status === 'Resolved').length,
      eventHistory: eventBus.getHistory().length
    };
  }
}

export const eventLoop = new OmniFOMOEventLoop();
export { OmniFOMOEventLoop };
