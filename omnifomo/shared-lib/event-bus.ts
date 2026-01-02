import { EventEmitter } from 'events';
import type { MomentMarket, UserPosition, DAHRAttestation, BetDirection, Chain } from './types';

export interface MarketCreatedEvent {
  market: MomentMarket;
  timestamp: number;
}

export interface BetPlacedEvent {
  positionId: string;
  marketId: string;
  userId: string;
  direction: BetDirection;
  amount: bigint;
  sourceChain: Chain;
  timestamp: number;
}

export interface DeadlineReachedEvent {
  marketId: string;
  deadline: number;
  timestamp: number;
}

export interface AttestationReadyEvent {
  marketId: string;
  attestationId: string;
  value: bigint;
  proofHash: string;
  timestamp: number;
}

export interface ResolutionCompleteEvent {
  marketId: string;
  winningDirection: BetDirection;
  finalValue: bigint;
  attestationHash: string;
  timestamp: number;
}

export interface PayoutSentEvent {
  batchId: string;
  marketId: string;
  recipientCount: number;
  totalAmount: bigint;
  timestamp: number;
}

export interface MarketUpdateEvent {
  marketId: string;
  poolState: {
    totalOverStake: bigint;
    totalUnderStake: bigint;
    participantCount: number;
  };
  timestamp: number;
}

export interface EventMap {
  market_created: MarketCreatedEvent;
  bet_placed: BetPlacedEvent;
  deadline_reached: DeadlineReachedEvent;
  attestation_ready: AttestationReadyEvent;
  resolution_complete: ResolutionCompleteEvent;
  payout_sent: PayoutSentEvent;
  market_update: MarketUpdateEvent;
  error: { source: string; error: Error; timestamp: number };
  shutdown: { reason: string; timestamp: number };
}

export type EventType = keyof EventMap;

class OmniFOMOEventBus {
  private emitter = new EventEmitter();
  private eventHistory: Array<{ type: EventType; data: EventMap[EventType] }> = [];
  private maxHistorySize = 1000;

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<T extends EventType>(type: T, data: Omit<EventMap[T], 'timestamp'>): void {
    const event = { ...data, timestamp: Date.now() } as EventMap[T];
    
    this.eventHistory.push({ type, data: event });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    console.log(`📢 Event: ${type}`, this.summarizeEvent(type, event));
    this.emitter.emit(type, event);
    this.emitter.emit('*', { type, data: event });
  }

  on<T extends EventType>(type: T, handler: (data: EventMap[T]) => void): () => void {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }

  once<T extends EventType>(type: T, handler: (data: EventMap[T]) => void): void {
    this.emitter.once(type, handler);
  }

  onAll(handler: (event: { type: EventType; data: EventMap[EventType] }) => void): () => void {
    this.emitter.on('*', handler);
    return () => this.emitter.off('*', handler);
  }

  off<T extends EventType>(type: T, handler: (data: EventMap[T]) => void): void {
    this.emitter.off(type, handler);
  }

  getHistory(type?: EventType, limit = 100): Array<{ type: EventType; data: EventMap[EventType] }> {
    let history = this.eventHistory;
    if (type) {
      history = history.filter(e => e.type === type);
    }
    return history.slice(-limit);
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  private summarizeEvent<T extends EventType>(type: T, data: EventMap[T]): Record<string, unknown> {
    switch (type) {
      case 'market_created':
        const mc = data as MarketCreatedEvent;
        return { marketId: mc.market.id.slice(0, 8), threshold: mc.market.threshold.toString() };
      case 'bet_placed':
        const bp = data as BetPlacedEvent;
        return { user: bp.userId.slice(0, 8), direction: bp.direction, amount: bp.amount.toString() };
      case 'attestation_ready':
        const ar = data as AttestationReadyEvent;
        return { marketId: ar.marketId.slice(0, 8), value: ar.value.toString() };
      case 'resolution_complete':
        const rc = data as ResolutionCompleteEvent;
        return { marketId: rc.marketId.slice(0, 8), winner: rc.winningDirection };
      case 'payout_sent':
        const ps = data as PayoutSentEvent;
        return { recipients: ps.recipientCount, total: ps.totalAmount.toString() };
      default:
        return {};
    }
  }

  getListenerCount(type: EventType): number {
    return this.emitter.listenerCount(type);
  }

  removeAllListeners(type?: EventType): void {
    if (type) {
      this.emitter.removeAllListeners(type);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

export const eventBus = new OmniFOMOEventBus();
export { OmniFOMOEventBus };
