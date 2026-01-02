import { 
  MomentMarket, 
  UserPosition, 
  DAHRAttestation,
  GCRDelta,
  SourceContext,
  BetDirection,
  Chain
} from '../shared-lib/types';
import { gcr } from '../shared-lib/gcr-client';
import { fhe } from '../shared-lib/fhe-mock';
import { gasTank } from '../shared-lib/gas-tank';
import { demosClient } from '../shared-lib/demos-client';
import { dahrClient } from '../shared-lib/dahr-client';
import { xmClient } from '../shared-lib/xm-client';

interface PlannerConfig {
  rpcUrl?: string;
  mnemonic?: string;
  useLiveSDK?: boolean;
}

class OmniFOMOPlanner {
  private config: PlannerConfig;
  private initialized = false;

  constructor(config: PlannerConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || process.env.DEMOS_RPC_URL || 'https://node2.demos.sh',
      mnemonic: config.mnemonic || process.env.SERVER_MNEMONIC,
      useLiveSDK: config.useLiveSDK ?? false
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.useLiveSDK && this.config.mnemonic) {
      console.log('🔗 Initializing live Demos SDK connection...');
      const result = await demosClient.connect({
        rpcUrl: this.config.rpcUrl!,
        mnemonic: this.config.mnemonic
      });

      if (!result.connected) {
        console.warn(`⚠️ SDK connection failed: ${result.error}. Running in simulation mode.`);
        this.config.useLiveSDK = false;
      } else {
        console.log(`✅ Connected to Demos Network as ${result.address}`);
      }
    } else {
      console.log('📋 Running in simulation mode (no live SDK)');
    }

    this.initialized = true;
  }

  async createMarket(
    sourceContext: SourceContext,
    metricType: 'views' | 'likes' | 'retweets',
    sourceId: string,
    threshold: bigint,
    deadlineMinutes: number
  ): Promise<string> {
    await this.initialize();

    const deadline = Math.floor(Date.now() / 1000) + (deadlineMinutes * 60);
    const marketId = gcr.generateId(sourceContext, sourceId, deadline.toString());

    const market: MomentMarket = {
      id: marketId,
      sourceContext,
      targetMetric: { type: metricType, sourceId },
      threshold,
      deadline,
      status: 'Open',
      resolution: null,
      poolState: {
        totalOverStake: 0n,
        totalUnderStake: 0n,
        participantCount: 0
      }
    };

    const delta: GCRDelta<MomentMarket> = {
      operation: 'CREATE',
      entity: 'MomentMarket',
      id: marketId,
      data: market,
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);
    console.log(`\n🎯 Market Created: Will ${sourceId} reach ${threshold} ${metricType}?`);
    console.log(`   Deadline: ${new Date(deadline * 1000).toISOString()}`);
    
    return marketId;
  }

  async placeBet(
    marketId: string,
    userId: string,
    direction: BetDirection,
    amount: bigint,
    sourceChain: Chain,
    depositToken: string
  ): Promise<string> {
    await this.initialize();

    const { settledAmount } = await gasTank.convert(userId, sourceChain, depositToken, amount);
    
    fhe.encrypt(settledAmount, `position_${marketId}_${userId}`);
    
    const positionId = gcr.generateId(userId, marketId);
    
    const position: UserPosition = {
      id: positionId,
      userId,
      marketId,
      stakeAmount: settledAmount,
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

    const market = gcr.get<MomentMarket>('MomentMarket', marketId);
    if (market) {
      const poolUpdate: GCRDelta<MomentMarket> = {
        operation: 'UPDATE',
        entity: 'MomentMarket',
        id: marketId,
        data: {
          poolState: {
            ...market.poolState,
            totalOverStake: market.poolState.totalOverStake + (direction === 'OVER' ? settledAmount : 0n),
            totalUnderStake: market.poolState.totalUnderStake + (direction === 'UNDER' ? settledAmount : 0n),
            participantCount: market.poolState.participantCount + 1
          }
        },
        timestamp: Date.now()
      };
      gcr.applyDelta(poolUpdate);
    }

    console.log(`\n💰 Bet Placed: ${userId.slice(0, 8)}... bets ${direction} with ${settledAmount} USDC (from ${sourceChain})`);
    
    return positionId;
  }

  async fetchAndAttestWeb2Data(
    marketId: string,
    sourceContext: SourceContext,
    sourceId: string
  ): Promise<{ value: bigint; attestationId: string }> {
    await this.initialize();

    let fetchedValue: bigint;
    let proofHash: string;

    if (this.config.useLiveSDK) {
      console.log(`\n📡 Fetching live Web2 data via DAHR...`);
      
      if (sourceContext === 'Web2_X') {
        const result = await dahrClient.fetchXMetrics(sourceId);
        const metrics = result.data as { views?: number; public_metrics?: { impression_count?: number } };
        fetchedValue = BigInt(metrics.views || metrics.public_metrics?.impression_count || 0);
        proofHash = result.attestation.proofHash;
      } else {
        const result = await dahrClient.fetchRandomNumber(1, 200000);
        fetchedValue = BigInt(result.data);
        proofHash = result.attestation.proofHash;
      }
    } else {
      console.log(`\n📡 Simulating Web2 data fetch...`);
      fetchedValue = BigInt(Math.floor(Math.random() * 200000));
      proofHash = `sim_proof_${Date.now()}`;
    }

    const attestationId = await this.submitDAHRAttestation(marketId, fetchedValue, proofHash);

    return { value: fetchedValue, attestationId };
  }

  async submitDAHRAttestation(
    marketId: string,
    fetchedValue: bigint,
    proofHash: string
  ): Promise<string> {
    const attestationId = gcr.generateId(marketId, proofHash);

    const attestation: DAHRAttestation = {
      id: attestationId,
      marketId,
      fetchedAt: Date.now(),
      rawValue: fetchedValue,
      proofHash,
      oracleSignature: `sig_${attestationId.slice(0, 16)}`,
      status: 'Verified'
    };

    const delta: GCRDelta<DAHRAttestation> = {
      operation: 'CREATE',
      entity: 'DAHRAttestation',
      id: attestationId,
      data: attestation,
      timestamp: Date.now()
    };

    gcr.applyDelta(delta);
    console.log(`\n📡 DAHR Attestation: Fetched value ${fetchedValue} with TLS proof`);
    
    return attestationId;
  }

  async resolveMarket(marketId: string, attestationId: string): Promise<void> {
    const market = gcr.get<MomentMarket>('MomentMarket', marketId);
    const attestation = gcr.get<DAHRAttestation>('DAHRAttestation', attestationId);

    if (!market || !attestation) {
      throw new Error('Market or attestation not found');
    }

    const winningDirection: BetDirection = attestation.rawValue >= market.threshold ? 'OVER' : 'UNDER';

    const resolutionDelta: GCRDelta<MomentMarket> = {
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

    gcr.applyDelta(resolutionDelta);

    console.log(`\n🏁 Market Resolved: Final value ${attestation.rawValue} - ${winningDirection} wins!`);
    console.log(`   Threshold was: ${market.threshold}`);

    await this.settlePositions(marketId, winningDirection);
  }

  private async settlePositions(marketId: string, winningDirection: BetDirection): Promise<void> {
    const positions = gcr.query<UserPosition>('UserPosition', p => p.marketId === marketId);
    const market = gcr.get<MomentMarket>('MomentMarket', marketId)!;

    const totalPool = market.poolState.totalOverStake + market.poolState.totalUnderStake;
    const winningPool = winningDirection === 'OVER' 
      ? market.poolState.totalOverStake 
      : market.poolState.totalUnderStake;

    const winners: { user: string; amount: bigint; targetChain: Chain; targetToken: string }[] = [];

    for (const position of positions) {
      if (position.direction === winningDirection) {
        const share = (position.stakeAmount * totalPool) / winningPool;
        winners.push({
          user: position.userId,
          amount: share,
          targetChain: position.sourceChain,
          targetToken: position.depositToken
        });
        console.log(`   🎉 Winner: ${position.userId.slice(0, 8)}... wins ${share} USDC`);
      } else {
        console.log(`   💸 Loser: ${position.userId.slice(0, 8)}... loses ${position.stakeAmount} USDC`);
      }
    }

    if (this.config.useLiveSDK && process.env.TREASURY_PRIVATE_KEY) {
      console.log(`\n🔄 Executing XM settlement transactions...`);
      const xmWinners = winners.map(w => ({
        address: w.user,
        amount: w.amount,
        chain: w.targetChain
      }));
      await xmClient.settleBetPayouts(xmWinners, process.env.TREASURY_PRIVATE_KEY);
    } else {
      await gasTank.distribute(winners);
    }

    console.log(`\n✅ Settlement complete via XM Script`);
  }

  getGCRState() {
    return {
      deltas: gcr.getDeltas(),
      epoch: gcr.getCurrentEpoch()
    };
  }
}

async function runSimulation() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       OmniFOMO Planner Simulation: Web2 → Web3 Bet Lifecycle  ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const useLiveSDK = process.argv.includes('--live');
  
  const planner = new OmniFOMOPlanner({
    useLiveSDK,
    rpcUrl: process.env.DEMOS_RPC_URL,
    mnemonic: process.env.SERVER_MNEMONIC
  });

  console.log(`Mode: ${useLiveSDK ? '🔴 LIVE SDK' : '🟢 SIMULATION'}\n`);
  console.log('📱 SCENARIO: Betting on viral X post reaching 100K views\n');

  const marketId = await planner.createMarket(
    'Web2_X',
    'views',
    'tweet_1234567890',
    100000n,
    60
  );

  console.log('\n--- Users placing bets from different chains ---');

  await planner.placeBet(
    marketId,
    '0xAlice_Ethereum_Address_123',
    'OVER',
    100n,
    'Ethereum',
    'ETH'
  );

  await planner.placeBet(
    marketId,
    '0xBob_Base_Address_456',
    'UNDER',
    500n,
    'Base',
    'USDC'
  );

  await planner.placeBet(
    marketId,
    'SolanaCharlie789PubKey',
    'OVER',
    1000n,
    'Solana',
    'SOL'
  );

  console.log('\n--- Simulating deadline reached ---');
  console.log('⏰ Market deadline reached, DAHR fetching X API...\n');

  const { attestationId } = await planner.fetchAndAttestWeb2Data(
    marketId,
    'Web2_X',
    'tweet_1234567890'
  );

  console.log('\n--- Resolution Epoch: Decrypting stakes and settling ---');

  await planner.resolveMarket(marketId, attestationId);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    Simulation Complete                         ');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const state = planner.getGCRState();
  console.log('\n📊 Final GCR State:');
  console.log(`   Total Deltas: ${state.deltas.length}`);
  console.log(`   Current Epoch: ${state.epoch}`);
}

runSimulation().catch(console.error);

export { OmniFOMOPlanner };
