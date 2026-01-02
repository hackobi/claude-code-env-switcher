export { MetricFetcher, metricFetcher } from './fetchers';
export { AttestationEngine, attestationEngine } from './attestation-engine';
export { OracleScheduler, oracleScheduler } from './scheduler';
export * from './types';

import { oracleScheduler } from './scheduler';
import { metricFetcher } from './fetchers';
import { attestationEngine } from './attestation-engine';
import type { MomentMarket } from '../shared-lib/types';
import type { MetricTarget, OracleConfig } from './types';

export class AgentAOracle {
  private config: Partial<OracleConfig>;
  private initialized = false;

  constructor(config: Partial<OracleConfig> = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                Agent A: Oracle/Web2 Specialist                 ');
    console.log('═══════════════════════════════════════════════════════════════');

    await attestationEngine.initialize();
    await oracleScheduler.start();

    this.initialized = true;
    console.log('✅ Agent A initialized and ready');
  }

  async shutdown(): Promise<void> {
    oracleScheduler.stop();
    this.initialized = false;
    console.log('🛑 Agent A shutdown complete');
  }

  scheduleResolution(market: MomentMarket): string {
    return oracleScheduler.scheduleMarketResolution(market);
  }

  async fetchMetricNow(target: MetricTarget): Promise<{
    success: boolean;
    value?: bigint;
    attestationId?: string;
    error?: string;
  }> {
    console.log(`\n📡 Immediate fetch requested: ${target.platform}/${target.sourceId}`);

    const result = await metricFetcher.fetch(target);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const proof = await attestationEngine.createAttestation(
      `immediate_${Date.now()}`,
      result
    );

    if (!proof) {
      return { success: false, error: 'Attestation creation failed' };
    }

    const attestationId = await attestationEngine.submitToGCR(proof);

    return {
      success: true,
      value: result.value,
      attestationId
    };
  }

  getStatus(): {
    running: boolean;
    pendingFetches: number;
    completedFetches: number;
    failedFetches: number;
  } {
    const fetches = oracleScheduler.getScheduledFetches();

    return {
      running: this.initialized,
      pendingFetches: fetches.filter(f => f.status === 'scheduled').length,
      completedFetches: fetches.filter(f => f.status === 'completed').length,
      failedFetches: fetches.filter(f => f.status === 'failed').length
    };
  }
}

export const agentA = new AgentAOracle();

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('\n🧪 Agent A Demo Mode\n');

    await agentA.initialize();

    const demoResult = await agentA.fetchMetricNow({
      platform: 'GitHub',
      sourceId: 'kynesyslabs/demosdk',
      metricType: 'stars'
    });

    console.log('\n📊 Demo Result:', demoResult);

    setTimeout(() => {
      agentA.shutdown();
      process.exit(0);
    }, 5000);
  })();
}
