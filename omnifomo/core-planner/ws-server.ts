import { eventBus, EventType, EventMap } from '../shared-lib/event-bus';

export type WSClient = {
  send: (data: string) => void;
  readyState: number;
};

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'get_history';
  events?: EventType[];
  limit?: number;
}

export interface WSResponse {
  type: 'event' | 'subscribed' | 'unsubscribed' | 'pong' | 'history' | 'error';
  data?: unknown;
  events?: EventType[];
  error?: string;
}

class WebSocketServer {
  private clients = new Set<WSClient>();
  private clientSubscriptions = new Map<WSClient, Set<EventType>>();
  private eventUnsubscribe: (() => void) | null = null;

  start(): void {
    console.log('🔌 WebSocket server starting...');

    this.eventUnsubscribe = eventBus.onAll((event) => {
      this.broadcast(event.type, event.data);
    });

    console.log('✅ WebSocket server ready');
  }

  stop(): void {
    if (this.eventUnsubscribe) {
      this.eventUnsubscribe();
      this.eventUnsubscribe = null;
    }

    this.clients.forEach(client => {
      try {
        client.send(JSON.stringify({ type: 'shutdown' }));
      } catch {}
    });

    this.clients.clear();
    this.clientSubscriptions.clear();

    console.log('🛑 WebSocket server stopped');
  }

  handleConnection(ws: WSClient): void {
    this.clients.add(ws);
    this.clientSubscriptions.set(ws, new Set(['market_created', 'bet_placed', 'resolution_complete', 'payout_sent']));

    console.log(`✅ WebSocket client connected (total: ${this.clients.size})`);

    this.sendToClient(ws, {
      type: 'subscribed',
      events: Array.from(this.clientSubscriptions.get(ws) || [])
    });
  }

  handleMessage(ws: WSClient, message: string | Buffer): void {
    try {
      const msg: WSMessage = JSON.parse(message.toString());

      switch (msg.type) {
        case 'subscribe':
          this.handleSubscribe(ws, msg.events || []);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, msg.events || []);
          break;

        case 'ping':
          this.sendToClient(ws, { type: 'pong' });
          break;

        case 'get_history':
          this.handleGetHistory(ws, msg.limit);
          break;

        default:
          this.sendToClient(ws, { type: 'error', error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
      this.sendToClient(ws, { type: 'error', error: 'Invalid JSON' });
    }
  }

  handleDisconnection(ws: WSClient): void {
    this.clients.delete(ws);
    this.clientSubscriptions.delete(ws);

    console.log(`👋 WebSocket client disconnected (remaining: ${this.clients.size})`);
  }

  private handleSubscribe(ws: WSClient, events: EventType[]): void {
    const subs = this.clientSubscriptions.get(ws) || new Set();
    events.forEach(e => subs.add(e));
    this.clientSubscriptions.set(ws, subs);

    this.sendToClient(ws, {
      type: 'subscribed',
      events: Array.from(subs)
    });
  }

  private handleUnsubscribe(ws: WSClient, events: EventType[]): void {
    const subs = this.clientSubscriptions.get(ws);
    if (subs) {
      events.forEach(e => subs.delete(e));
    }

    this.sendToClient(ws, {
      type: 'unsubscribed',
      events
    });
  }

  private handleGetHistory(ws: WSClient, limit = 50): void {
    const history = eventBus.getHistory(undefined, limit);

    this.sendToClient(ws, {
      type: 'history',
      data: history.map(h => ({
        type: h.type,
        data: this.serializeEvent(h.data)
      }))
    });
  }

  private broadcast<T extends EventType>(type: T, data: EventMap[T]): void {
    const serialized = JSON.stringify({
      type: 'event',
      data: {
        type,
        payload: this.serializeEvent(data)
      }
    });

    this.clients.forEach(client => {
      const subs = this.clientSubscriptions.get(client);
      if (subs?.has(type) && client.readyState === 1) {
        try {
          client.send(serialized);
        } catch (error) {
          console.error('❌ Failed to send to client:', error);
        }
      }
    });
  }

  private sendToClient(ws: WSClient, response: WSResponse): void {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(response));
      } catch (error) {
        console.error('❌ Failed to send to client:', error);
      }
    }
  }

  private serializeEvent(data: unknown): unknown {
    return JSON.parse(JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }

  getStats(): {
    connectedClients: number;
    subscriptionCounts: Record<string, number>;
  } {
    const subscriptionCounts: Record<string, number> = {};

    this.clientSubscriptions.forEach(subs => {
      subs.forEach(event => {
        subscriptionCounts[event] = (subscriptionCounts[event] || 0) + 1;
      });
    });

    return {
      connectedClients: this.clients.size,
      subscriptionCounts
    };
  }
}

export const wsServer = new WebSocketServer();
export { WebSocketServer };
