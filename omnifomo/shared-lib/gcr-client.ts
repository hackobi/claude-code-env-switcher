import { GCRDelta, MomentMarket, UserPosition, DAHRAttestation } from './types';
import { createHash } from 'crypto';

type EntityType = MomentMarket | UserPosition | DAHRAttestation;

export class GCRClient {
  private state: Map<string, EntityType> = new Map();
  private deltas: GCRDelta<EntityType>[] = [];
  private epoch: number = 0;

  generateId(...parts: string[]): string {
    return createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 64);
  }

  applyDelta<T extends EntityType>(delta: GCRDelta<T>): void {
    const key = `${delta.entity}:${delta.id}`;
    
    switch (delta.operation) {
      case 'CREATE':
        this.state.set(key, delta.data as T);
        break;
      case 'UPDATE':
        const existing = this.state.get(key);
        if (existing) {
          this.state.set(key, { ...existing, ...delta.data });
        }
        break;
      case 'DELETE':
        this.state.delete(key);
        break;
    }
    
    this.deltas.push(delta as GCRDelta<EntityType>);
    console.log(`[GCR] Delta applied: ${delta.operation} ${delta.entity}:${delta.id.slice(0, 8)}...`);
  }

  get<T extends EntityType>(entity: string, id: string): T | undefined {
    return this.state.get(`${entity}:${id}`) as T | undefined;
  }

  query<T extends EntityType>(entity: string, predicate: (item: T) => boolean): T[] {
    const results: T[] = [];
    for (const [key, value] of this.state.entries()) {
      if (key.startsWith(`${entity}:`) && predicate(value as T)) {
        results.push(value as T);
      }
    }
    return results;
  }

  getDeltas(fromEpoch?: number): GCRDelta<EntityType>[] {
    if (fromEpoch === undefined) return this.deltas;
    return this.deltas.filter((_, i) => i >= fromEpoch);
  }

  advanceEpoch(): number {
    return ++this.epoch;
  }

  getCurrentEpoch(): number {
    return this.epoch;
  }
}

export const gcr = new GCRClient();
