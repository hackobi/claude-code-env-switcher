import { serve } from '@hono/node-server';
import { app } from './api';
import { eventLoop } from './event-loop';
import { wsServer, WSClient } from './ws-server';
import { demosClient } from '../shared-lib/demos-client';

interface ServerConfig {
  port: number;
  wsPort: number;
  useLiveSDK: boolean;
  rpcUrl: string;
  mnemonic?: string;
}

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001'),
  wsPort: parseInt(process.env.WS_PORT || '3002'),
  useLiveSDK: process.argv.includes('--live'),
  rpcUrl: process.env.DEMOS_RPC_URL || 'https://node2.demos.sh',
  mnemonic: process.env.SERVER_MNEMONIC
};

async function startServer() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    OmniFOMO Server                             ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Configuration:', {
    port: config.port,
    wsPort: config.wsPort,
    mode: config.useLiveSDK ? '🔴 LIVE SDK' : '🟢 SIMULATION',
    rpcUrl: config.rpcUrl
  });

  if (config.useLiveSDK && config.mnemonic) {
    console.log('\n🔗 Connecting to Demos Network...');
    const result = await demosClient.connect({
      rpcUrl: config.rpcUrl,
      mnemonic: config.mnemonic
    });

    if (result.connected) {
      console.log(`✅ Connected as ${result.address}`);
    } else {
      console.warn(`⚠️ SDK connection failed: ${result.error}`);
      console.log('   Continuing in simulation mode...');
    }
  }

  console.log('\n🔄 Starting event loop...');
  await eventLoop.start();

  console.log('\n🔌 Starting WebSocket server...');
  wsServer.start();

  const httpServer = serve({
    fetch: app.fetch,
    port: config.port
  });

  console.log(`\n🌐 HTTP server running on http://localhost:${config.port}`);

  let wsServerInstance: any = null;

  if (typeof (globalThis as any).Bun !== 'undefined') {
    const BunGlobal = (globalThis as any).Bun;
    wsServerInstance = BunGlobal.serve({
      port: config.wsPort,
      fetch(req: Request, server: any) {
        const url = new URL(req.url);
        if (url.pathname === '/ws' && server.upgrade(req)) {
          return;
        }
        return new Response('WebSocket endpoint - use /ws', { status: 404 });
      },
      websocket: {
        open(ws: any) {
          wsServer.handleConnection(ws as WSClient);
        },
        message(ws: any, message: string | Buffer) {
          wsServer.handleMessage(ws as WSClient, message);
        },
        close(ws: any) {
          wsServer.handleDisconnection(ws as WSClient);
        },
        error(ws: any, error: Error) {
          console.error('❌ WebSocket error:', error);
        }
      }
    });
    console.log(`🔌 WebSocket server running on ws://localhost:${config.wsPort}/ws`);
  } else {
    console.log(`⚠️ WebSocket server requires Bun runtime for native support`);
    console.log(`   Using HTTP polling mode instead`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    Server Ready                                ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nEndpoints:');
  console.log(`  Health:      http://localhost:${config.port}/health`);
  console.log(`  Markets:     http://localhost:${config.port}/api/markets`);
  console.log(`  Stats:       http://localhost:${config.port}/api/stats`);
  console.log(`  Events:      http://localhost:${config.port}/api/events`);
  if (wsServerInstance) {
    console.log(`  WebSocket:   ws://localhost:${config.wsPort}/ws`);
  }
  console.log('\nPress Ctrl+C to stop\n');

  async function shutdown(signal: string) {
    console.log(`\n🛑 Received ${signal}, shutting down...`);

    await eventLoop.stop();
    wsServer.stop();

    if (wsServerInstance) {
      wsServerInstance.stop();
    }

    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
