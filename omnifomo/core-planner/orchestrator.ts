import { serve } from '@hono/node-server';
import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { messageQueue, MESSAGE_TYPES, AgentMessage } from '../shared-lib/message-queue';
import { eventBus } from '../shared-lib/event-bus';
import { gcr } from '../shared-lib/gcr-client';
import { gasTank } from '../shared-lib/gas-tank';
import { fhe } from '../shared-lib/fhe-mock';
import type { MomentMarket, UserPosition, DAHRAttestation, GCRDelta, SourceContext, BetDirection, Chain } from '../shared-lib/types';

interface OrchestratorConfig {
  port: number;
  redisUrl?: string;
}

const config: OrchestratorConfig = {
  port: parseInt(process.env.PORT || '3001'),
  redisUrl: process.env.REDIS_URL
};

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://omnifomo.demos.sh'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

const agentHealth: Record<string, { status: string; lastSeen: number; stats: unknown }> = {
  'agent-a': { status: 'unknown', lastSeen: 0, stats: {} },
  'agent-b': { status: 'unknown', lastSeen: 0, stats: {} }
};

app.get('/health', (c: Context) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    agents: agentHealth,
    messageQueue: messageQueue.isConnected()
  });
});

app.get('/api/markets', (c: Context) => {
  const status = c.req.query('status');
  const markets = gcr.query<MomentMarket>('MomentMarket', m => 
    status ? m.status === status : true
  );

  return c.json({
    success: true,
    data: markets.map(m => ({
      ...m,
      threshold: m.threshold.toString(),
      poolState: {
        ...m.poolState,
        totalOverStake: m.poolState.totalOverStake.toString(),
        totalUnderStake: m.poolState.totalUnderStake.toString()
      }
    }))
  });
});

app.get('/api/markets/:marketId', (c: Context) => {
  const marketId = c.req.param('marketId');
  const market = gcr.get<MomentMarket>('MomentMarket', marketId);

  if (!market) {
    return c.json({ success: false, error: 'Market not found' }, 404);
  }

  const positions = gcr.query<UserPosition>('UserPosition', p => p.marketId === marketId);

  return c.json({
    success: true,
    data: {
      market: {
        ...market,
        threshold: market.threshold.toString(),
        poolState: {
          ...market.poolState,
          totalOverStake: market.poolState.totalOverStake.toString(),
          totalUnderStake: market.poolState.totalUnderStake.toString()
        }
      },
      positions: positions.map(p => ({
        ...p,
        stakeAmount: p.stakeAmount.toString()
      }))
    }
  });
});

app.post('/api/markets', async (c: Context) => {
  const body = await c.req.json();
  const { sourceContext, metricType, sourceId, threshold, deadlineMinutes } = body;

  if (!sourceContext || !metricType || !sourceId || !threshold || !deadlineMinutes) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  const deadline = Math.floor(Date.now() / 1000) + (deadlineMinutes * 60);
  const marketId = gcr.generateId(sourceContext, sourceId, deadline.toString());

  const market: MomentMarket = {
    id: marketId,
    sourceContext: sourceContext as SourceContext,
    targetMetric: { type: metricType, sourceId },
    threshold: BigInt(threshold),
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

  eventBus.emit('market_created', { market });

  const correlationId = `market_${marketId}`;
  await messageQueue.send('agent-a', MESSAGE_TYPES.SCHEDULE_RESOLUTION, {
    market: {
      ...market,
      threshold: market.threshold.toString(),
      poolState: {
        ...market.poolState,
        totalOverStake: market.poolState.totalOverStake.toString(),
        totalUnderStake: market.poolState.totalUnderStake.toString()
      }
    }
  }, correlationId);

  return c.json({
    success: true,
    data: {
      marketId,
      deadline: new Date(deadline * 1000).toISOString(),
      message: 'Market created, Agent A notified for resolution scheduling'
    }
  });
});

app.post('/api/bets', async (c: Context) => {
  const body = await c.req.json();
  const { marketId, userId, direction, amount, sourceChain, depositToken } = body;

  if (!marketId || !userId || !direction || !amount || !sourceChain || !depositToken) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  const market = gcr.get<MomentMarket>('MomentMarket', marketId);
  if (!market) {
    return c.json({ success: false, error: 'Market not found' }, 404);
  }

  if (market.status !== 'Open') {
    return c.json({ success: false, error: 'Market is not open' }, 400);
  }

  const { settledAmount } = await gasTank.convert(userId, sourceChain, depositToken, BigInt(amount));
  fhe.encrypt(settledAmount, `position_${marketId}_${userId}`);

  const positionId = gcr.generateId(userId, marketId);

  const position: UserPosition = {
    id: positionId,
    userId,
    marketId,
    stakeAmount: settledAmount,
    direction: direction as BetDirection,
    sourceChain: sourceChain as Chain,
    depositToken,
    createdAt: Date.now(),
    claimed: false
  };

  gcr.applyDelta({
    operation: 'CREATE',
    entity: 'UserPosition',
    id: positionId,
    data: position,
    timestamp: Date.now()
  });

  gcr.applyDelta({
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
  });

  eventBus.emit('bet_placed', {
    positionId,
    marketId,
    userId,
    direction: direction as BetDirection,
    amount: settledAmount,
    sourceChain: sourceChain as Chain
  });

  return c.json({
    success: true,
    data: {
      positionId,
      settledAmount: settledAmount.toString(),
      direction
    }
  });
});

app.get('/api/agents', (c: Context) => {
  return c.json({
    success: true,
    data: agentHealth
  });
});

app.post('/api/agents/health-check', async (c: Context) => {
  await messageQueue.broadcast(MESSAGE_TYPES.HEALTH_CHECK, {
    requestedAt: Date.now()
  });

  return c.json({
    success: true,
    message: 'Health check broadcast sent'
  });
});

app.get('/api/messages', (c: Context) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const history = messageQueue.getHistory(limit);

  return c.json({
    success: true,
    data: history
  });
});

app.get('/api/stats', (c: Context) => {
  const markets = gcr.query<MomentMarket>('MomentMarket', () => true);
  const positions = gcr.query<UserPosition>('UserPosition', () => true);

  let totalVolume = 0n;
  for (const m of markets) {
    totalVolume += m.poolState.totalOverStake + m.poolState.totalUnderStake;
  }

  return c.json({
    success: true,
    data: {
      totalMarkets: markets.length,
      openMarkets: markets.filter(m => m.status === 'Open').length,
      resolvedMarkets: markets.filter(m => m.status === 'Resolved').length,
      totalPositions: positions.length,
      uniqueUsers: new Set(positions.map(p => p.userId)).size,
      totalVolume: totalVolume.toString(),
      agents: agentHealth
    }
  });
});

function setupMessageHandlers(): void {
  messageQueue.on(MESSAGE_TYPES.HEALTH_RESPONSE, (msg) => {
    const { agent, status, stats } = msg.payload as { agent: string; status: string; stats: unknown };
    agentHealth[agent] = {
      status,
      lastSeen: Date.now(),
      stats
    };
    console.log(`💚 ${agent} health: ${status}`);
  });

  messageQueue.on(MESSAGE_TYPES.RESOLUTION_SCHEDULED, (msg) => {
    const { marketId, fetchId, deadline } = msg.payload as { marketId: string; fetchId: string; deadline: number };
    console.log(`📅 Resolution scheduled: ${marketId.slice(0, 8)}... (fetch: ${fetchId.slice(0, 8)}...)`);
  });

  messageQueue.on(MESSAGE_TYPES.ATTESTATION_CREATED, (msg) => {
    const { marketId, attestationId, value } = msg.payload as { marketId: string; attestationId: string; value: string };
    console.log(`🔐 Attestation created: ${marketId.slice(0, 8)}... value=${value}`);
    
    eventBus.emit('attestation_ready', {
      marketId,
      attestationId,
      value: BigInt(value),
      proofHash: ''
    });
  });

  messageQueue.on(MESSAGE_TYPES.MARKET_SETTLED, (msg) => {
    const { marketId, winningDirection, totalPayout } = msg.payload as {
      marketId: string;
      winningDirection: string;
      totalPayout: string;
    };
    console.log(`✅ Market settled: ${marketId.slice(0, 8)}... winner=${winningDirection} payout=${totalPayout}`);

    const market = gcr.get<MomentMarket>('MomentMarket', marketId);
    if (market) {
      eventBus.emit('resolution_complete', {
        marketId,
        winningDirection: winningDirection as BetDirection,
        finalValue: 0n,
        attestationHash: ''
      });
    }
  });

  messageQueue.on(MESSAGE_TYPES.ERROR, (msg) => {
    const { marketId, error, phase } = msg.payload as { marketId?: string; error: string; phase?: string };
    console.error(`❌ Agent error: ${error} (market: ${marketId?.slice(0, 8) || 'N/A'}, phase: ${phase || 'unknown'})`);
    
    eventBus.emit('error', {
      source: `agent:${msg.source}`,
      error: new Error(error)
    });
  });

  messageQueue.onAll((msg) => {
    console.log(`📨 [${msg.source}→${msg.target}] ${msg.type}`);
  });
}

async function startOrchestrator(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                 OmniFOMO Orchestrator                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Configuration:', {
    port: config.port,
    redis: config.redisUrl || 'in-memory'
  });

  await messageQueue.connect({
    identity: 'orchestrator',
    redisUrl: config.redisUrl
  });

  setupMessageHandlers();

  serve({
    fetch: app.fetch,
    port: config.port
  });

  console.log(`\n🌐 Orchestrator running on http://localhost:${config.port}`);
  console.log('\nEndpoints:');
  console.log(`  Health:      http://localhost:${config.port}/health`);
  console.log(`  Markets:     http://localhost:${config.port}/api/markets`);
  console.log(`  Agents:      http://localhost:${config.port}/api/agents`);
  console.log(`  Stats:       http://localhost:${config.port}/api/stats`);
  console.log(`  Messages:    http://localhost:${config.port}/api/messages`);
  console.log('\n📡 Waiting for agents to connect...\n');

  await messageQueue.broadcast(MESSAGE_TYPES.HEALTH_CHECK, { requestedAt: Date.now() });
}

async function shutdown(): Promise<void> {
  console.log('\n🛑 Shutting down orchestrator...');
  
  await messageQueue.broadcast(MESSAGE_TYPES.SHUTDOWN, { reason: 'orchestrator-shutdown' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await messageQueue.disconnect();
  
  console.log('✅ Orchestrator shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startOrchestrator().catch(error => {
  console.error('❌ Failed to start orchestrator:', error);
  process.exit(1);
});

export { app };
