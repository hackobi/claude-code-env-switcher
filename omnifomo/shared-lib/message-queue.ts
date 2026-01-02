import { EventEmitter } from 'events';

export type AgentMessage = {
  id: string;
  type: string;
  source: 'orchestrator' | 'agent-a' | 'agent-b';
  target: 'orchestrator' | 'agent-a' | 'agent-b' | 'broadcast';
  payload: unknown;
  timestamp: number;
  correlationId?: string;
};

export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

interface RedisLike {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  quit(): Promise<void>;
}

class InMemoryPubSub implements RedisLike {
  private emitter = new EventEmitter();

  async publish(channel: string, message: string): Promise<number> {
    this.emitter.emit(channel, message);
    return this.emitter.listenerCount(channel);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.emitter.on(channel, handler);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.emitter.removeAllListeners(channel);
  }

  async quit(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}

const CHANNELS = {
  ORCHESTRATOR: 'omnifomo:orchestrator',
  AGENT_A: 'omnifomo:agent-a',
  AGENT_B: 'omnifomo:agent-b',
  BROADCAST: 'omnifomo:broadcast'
} as const;

class MessageQueue {
  private redis: RedisLike | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private identity: 'orchestrator' | 'agent-a' | 'agent-b' = 'orchestrator';
  private connected = false;
  private messageHistory: AgentMessage[] = [];
  private maxHistory = 500;

  async connect(options: {
    identity: 'orchestrator' | 'agent-a' | 'agent-b';
    redisUrl?: string;
  }): Promise<void> {
    this.identity = options.identity;

    if (options.redisUrl) {
      try {
        const Redis = (await import('ioredis')).default;
        this.redis = new Redis(options.redisUrl) as unknown as RedisLike;
        console.log(`📡 [${this.identity}] Connected to Redis: ${options.redisUrl}`);
      } catch (error) {
        console.warn(`⚠️ [${this.identity}] Redis unavailable, using in-memory pub/sub`);
        this.redis = new InMemoryPubSub();
      }
    } else {
      console.log(`📡 [${this.identity}] Using in-memory pub/sub (no Redis URL)`);
      this.redis = new InMemoryPubSub();
    }

    await this.subscribeToChannels();
    this.connected = true;
  }

  private async subscribeToChannels(): Promise<void> {
    if (!this.redis) return;

    const myChannel = this.getMyChannel();
    await this.redis.subscribe(myChannel, (msg) => this.handleMessage(msg));
    await this.redis.subscribe(CHANNELS.BROADCAST, (msg) => this.handleMessage(msg));

    console.log(`📥 [${this.identity}] Subscribed to: ${myChannel}, ${CHANNELS.BROADCAST}`);
  }

  private getMyChannel(): string {
    switch (this.identity) {
      case 'orchestrator': return CHANNELS.ORCHESTRATOR;
      case 'agent-a': return CHANNELS.AGENT_A;
      case 'agent-b': return CHANNELS.AGENT_B;
    }
  }

  private getTargetChannel(target: AgentMessage['target']): string {
    switch (target) {
      case 'orchestrator': return CHANNELS.ORCHESTRATOR;
      case 'agent-a': return CHANNELS.AGENT_A;
      case 'agent-b': return CHANNELS.AGENT_B;
      case 'broadcast': return CHANNELS.BROADCAST;
    }
  }

  private handleMessage(raw: string): void {
    try {
      const message: AgentMessage = JSON.parse(raw);
      
      if (message.source === this.identity) return;

      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxHistory) {
        this.messageHistory.shift();
      }

      console.log(`📨 [${this.identity}] Received: ${message.type} from ${message.source}`);

      const handlers = this.handlers.get(message.type) || new Set();
      const allHandlers = this.handlers.get('*') || new Set();

      [...handlers, ...allHandlers].forEach(async (handler) => {
        try {
          await handler(message);
        } catch (error) {
          console.error(`❌ [${this.identity}] Handler error:`, error);
        }
      });
    } catch (error) {
      console.error(`❌ [${this.identity}] Failed to parse message:`, error);
    }
  }

  async send(
    target: AgentMessage['target'],
    type: string,
    payload: unknown,
    correlationId?: string
  ): Promise<string> {
    if (!this.redis) {
      throw new Error('Message queue not connected');
    }

    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      source: this.identity,
      target,
      payload,
      timestamp: Date.now(),
      correlationId
    };

    const channel = this.getTargetChannel(target);
    await this.redis.publish(channel, JSON.stringify(message));

    console.log(`📤 [${this.identity}] Sent: ${type} to ${target}`);

    return message.id;
  }

  async broadcast(type: string, payload: unknown): Promise<string> {
    return this.send('broadcast', type, payload);
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  onAll(handler: MessageHandler): () => void {
    return this.on('*', handler);
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.handlers.clear();
    this.connected = false;
    console.log(`👋 [${this.identity}] Disconnected from message queue`);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getIdentity(): string {
    return this.identity;
  }

  getHistory(limit = 50): AgentMessage[] {
    return this.messageHistory.slice(-limit);
  }
}

export const MESSAGE_TYPES = {
  SCHEDULE_RESOLUTION: 'schedule_resolution',
  RESOLUTION_SCHEDULED: 'resolution_scheduled',
  FETCH_METRIC: 'fetch_metric',
  METRIC_FETCHED: 'metric_fetched',
  ATTESTATION_CREATED: 'attestation_created',
  SETTLE_MARKET: 'settle_market',
  MARKET_SETTLED: 'market_settled',
  PAYOUT_COMPLETE: 'payout_complete',
  HEALTH_CHECK: 'health_check',
  HEALTH_RESPONSE: 'health_response',
  ERROR: 'error',
  SHUTDOWN: 'shutdown'
} as const;

export const messageQueue = new MessageQueue();
export { MessageQueue, CHANNELS };
