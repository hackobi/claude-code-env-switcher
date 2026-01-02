import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { gcr } from '../shared-lib/gcr-client';
import { eventBus } from '../shared-lib/event-bus';
import { gasTank } from '../shared-lib/gas-tank';
import { fhe } from '../shared-lib/fhe-mock';
import type { MomentMarket, UserPosition, DAHRAttestation, GCRDelta, SourceContext, BetDirection, Chain } from '../shared-lib/types';
import { eventLoop } from './event-loop';
import { wsServer } from './ws-server';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://omnifomo.demos.sh'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.get('/health', (c: Context) => {
  const loopStats = eventLoop.getStats();
  const wsStats = wsServer.getStats();

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    loop: loopStats,
    websocket: wsStats
  });
});

app.get('/api/markets', (c: Context) => {
  try {
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
        },
        resolution: m.resolution ? {
          ...m.resolution,
          finalValue: m.resolution.finalValue.toString()
        } : null
      }))
    });
  } catch (error) {
    console.error('❌ Failed to get markets:', error);
    return c.json({ success: false, error: 'Failed to fetch markets' }, 500);
  }
});

app.get('/api/markets/:marketId', (c: Context) => {
  try {
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
  } catch (error) {
    console.error('❌ Failed to get market:', error);
    return c.json({ success: false, error: 'Failed to fetch market' }, 500);
  }
});

app.post('/api/markets', async (c: Context) => {
  try {
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

    return c.json({
      success: true,
      data: {
        marketId,
        deadline: new Date(deadline * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to create market:', error);
    return c.json({ success: false, error: 'Failed to create market' }, 500);
  }
});

app.post('/api/bets', async (c: Context) => {
  try {
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
      return c.json({ success: false, error: 'Market is not open for betting' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= market.deadline) {
      return c.json({ success: false, error: 'Market deadline has passed' }, 400);
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

    const positionDelta: GCRDelta<UserPosition> = {
      operation: 'CREATE',
      entity: 'UserPosition',
      id: positionId,
      data: position,
      timestamp: Date.now()
    };

    gcr.applyDelta(positionDelta);

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

    eventBus.emit('bet_placed', {
      positionId,
      marketId,
      userId,
      direction: direction as BetDirection,
      amount: settledAmount,
      sourceChain: sourceChain as Chain
    });

    const updatedMarket = gcr.get<MomentMarket>('MomentMarket', marketId)!;
    eventBus.emit('market_update', {
      marketId,
      poolState: {
        totalOverStake: updatedMarket.poolState.totalOverStake,
        totalUnderStake: updatedMarket.poolState.totalUnderStake,
        participantCount: updatedMarket.poolState.participantCount
      }
    });

    return c.json({
      success: true,
      data: {
        positionId,
        settledAmount: settledAmount.toString(),
        direction
      }
    });
  } catch (error) {
    console.error('❌ Failed to place bet:', error);
    return c.json({ success: false, error: 'Failed to place bet' }, 500);
  }
});

app.get('/api/positions/:userId', (c: Context) => {
  try {
    const userId = c.req.param('userId');
    const positions = gcr.query<UserPosition>('UserPosition', p => p.userId === userId);

    return c.json({
      success: true,
      data: positions.map(p => ({
        ...p,
        stakeAmount: p.stakeAmount.toString()
      }))
    });
  } catch (error) {
    console.error('❌ Failed to get positions:', error);
    return c.json({ success: false, error: 'Failed to fetch positions' }, 500);
  }
});

app.get('/api/attestations', (c: Context) => {
  try {
    const marketId = c.req.query('marketId');
    const attestations = gcr.query<DAHRAttestation>('DAHRAttestation', a =>
      marketId ? a.marketId === marketId : true
    );

    return c.json({
      success: true,
      data: attestations.map(a => ({
        ...a,
        rawValue: a.rawValue.toString()
      }))
    });
  } catch (error) {
    console.error('❌ Failed to get attestations:', error);
    return c.json({ success: false, error: 'Failed to fetch attestations' }, 500);
  }
});

app.get('/api/events', (c: Context) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const type = c.req.query('type') as any;
    const history = eventBus.getHistory(type, limit);

    return c.json({
      success: true,
      data: history.map(h => ({
        type: h.type,
        data: JSON.parse(JSON.stringify(h.data, (_, v) => typeof v === 'bigint' ? v.toString() : v))
      }))
    });
  } catch (error) {
    console.error('❌ Failed to get events:', error);
    return c.json({ success: false, error: 'Failed to fetch events' }, 500);
  }
});

app.get('/api/stats', (c: Context) => {
  try {
    const markets = gcr.query<MomentMarket>('MomentMarket', () => true);
    const positions = gcr.query<UserPosition>('UserPosition', () => true);

    let totalVolume = 0n;
    for (const m of markets) {
      totalVolume += m.poolState.totalOverStake + m.poolState.totalUnderStake;
    }

    const uniqueUsers = new Set(positions.map(p => p.userId));

    return c.json({
      success: true,
      data: {
        totalMarkets: markets.length,
        openMarkets: markets.filter(m => m.status === 'Open').length,
        resolvedMarkets: markets.filter(m => m.status === 'Resolved').length,
        totalPositions: positions.length,
        uniqueUsers: uniqueUsers.size,
        totalVolume: totalVolume.toString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to get stats:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

export { app };
