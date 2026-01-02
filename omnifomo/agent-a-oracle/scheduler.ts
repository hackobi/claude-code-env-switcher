import { gcr } from '../shared-lib/gcr-client';
import { eventBus } from '../shared-lib/event-bus';
import type { MomentMarket, DAHRAttestation } from '../shared-lib/types';
import { metricFetcher } from './fetchers';
import { attestationEngine } from './attestation-engine';
import type { ScheduledFetch, MetricTarget, OracleConfig, Web2Platform } from './types';

const DEFAULT_CONFIG: OracleConfig = {
  pollIntervalMs: 10000,
  maxRetries: 3,
  retryDelayMs: 5000
};

export class OracleScheduler {
  private scheduledFetches: Map<string, ScheduledFetch> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private config: OracleConfig;
  private isRunning = false;

  constructor(config: Partial<OracleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('🚀 Oracle Scheduler starting...');
    await attestationEngine.initialize();

    this.isRunning = true;
    this.pollInterval = setInterval(() => this.poll(), this.config.pollIntervalMs);

    console.log(`✅ Oracle Scheduler running (poll interval: ${this.config.pollIntervalMs}ms)`);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Oracle Scheduler stopped');
  }

  scheduleMarketResolution(market: MomentMarket): string {
    const target = this.extractMetricTarget(market);
    
    const fetch: ScheduledFetch = {
      id: gcr.generateId('fetch', market.id, Date.now().toString()),
      marketId: market.id,
      target,
      deadline: market.deadline,
      status: 'scheduled',
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };

    this.scheduledFetches.set(fetch.id, fetch);

    console.log(`📅 Scheduled fetch for market ${market.id.slice(0, 8)}...`);
    console.log(`   Target: ${target.platform}/${target.sourceId} (${target.metricType})`);
    console.log(`   Deadline: ${new Date(market.deadline * 1000).toISOString()}`);

    return fetch.id;
  }

  private extractMetricTarget(market: MomentMarket): MetricTarget {
    const contextToPlatform: Record<string, Web2Platform> = {
      'Web2_X': 'X',
      'Web2_Farcaster': 'Farcaster',
      'Web2_YouTube': 'YouTube'
    };

    return {
      platform: contextToPlatform[market.sourceContext] || 'X',
      sourceId: market.targetMetric.sourceId,
      metricType: market.targetMetric.type as any
    };
  }

  private async poll(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    for (const [fetchId, fetch] of this.scheduledFetches) {
      if (fetch.status !== 'scheduled') continue;
      if (now < fetch.deadline) continue;

      console.log(`⏰ Deadline reached for fetch ${fetchId.slice(0, 8)}...`);
      await this.executeFetch(fetch);
    }
  }

  private async executeFetch(fetch: ScheduledFetch): Promise<void> {
    fetch.status = 'fetching';
    this.scheduledFetches.set(fetch.id, fetch);

    console.log(`📡 Executing fetch for market ${fetch.marketId.slice(0, 8)}...`);

    const result = await metricFetcher.fetch(fetch.target);

    if (!result.success) {
      fetch.retryCount++;
      
      if (fetch.retryCount < fetch.maxRetries) {
        console.log(`⚠️ Fetch failed, retrying (${fetch.retryCount}/${fetch.maxRetries})...`);
        fetch.status = 'scheduled';
        this.scheduledFetches.set(fetch.id, fetch);
        
        setTimeout(() => this.executeFetch(fetch), this.config.retryDelayMs);
        return;
      }

      console.error(`❌ Fetch permanently failed for market ${fetch.marketId.slice(0, 8)}...`);
      fetch.status = 'failed';
      this.scheduledFetches.set(fetch.id, fetch);
      return;
    }

    const proof = await attestationEngine.createAttestation(fetch.marketId, result);
    
    if (proof) {
      const attestationId = await attestationEngine.submitToGCR(proof);
      
      fetch.status = 'completed';
      this.scheduledFetches.set(fetch.id, fetch);

      console.log(`✅ Fetch completed and attested: ${attestationId.slice(0, 16)}...`);

      this.emitResolutionReady(fetch.marketId, attestationId);
    }
  }

  private emitResolutionReady(marketId: string, attestationId: string): void {
    const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);
    
    if (attestation) {
      eventBus.emit('attestation_ready', {
        marketId,
        attestationId,
        value: attestation.rawValue,
        proofHash: attestation.proofHash
      });
    }

    console.log(`📣 Resolution ready for market ${marketId.slice(0, 8)}... (attestation: ${attestationId.slice(0, 8)}...)`);
  }

  onDeadlineReached(handler: (marketId: string) => void): () => void {
    return eventBus.on('deadline_reached', (event) => {
      const fetch = Array.from(this.scheduledFetches.values())
        .find(f => f.marketId === event.marketId && f.status === 'scheduled');
      
      if (fetch) {
        this.executeFetch(fetch);
      }
    });
  }

  getScheduledFetches(): ScheduledFetch[] {
    return Array.from(this.scheduledFetches.values());
  }

  getFetchStatus(fetchId: string): ScheduledFetch | undefined {
    return this.scheduledFetches.get(fetchId);
  }

  cancelFetch(fetchId: string): boolean {
    const fetch = this.scheduledFetches.get(fetchId);
    if (!fetch || fetch.status !== 'scheduled') return false;

    this.scheduledFetches.delete(fetchId);
    console.log(`🚫 Fetch cancelled: ${fetchId.slice(0, 8)}...`);
    return true;
  }
}

export const oracleScheduler = new OracleScheduler();
