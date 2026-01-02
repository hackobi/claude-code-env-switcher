import type { Chain, BetDirection } from '../shared-lib/types';

export interface PositionSettlement {
  positionId: string;
  userId: string;
  marketId: string;
  direction: BetDirection;
  stakeAmount: bigint;
  payout: bigint;
  isWinner: boolean;
  sourceChain: Chain;
  depositToken: string;
}

export interface SettlementBatch {
  id: string;
  marketId: string;
  winningDirection: BetDirection;
  totalPool: bigint;
  winningPool: bigint;
  losingPool: bigint;
  positions: PositionSettlement[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface FHEEncryptedValue {
  ciphertext: string;
  context: string;
  canDecrypt: boolean;
}

export interface GasTankDeposit {
  id: string;
  userId: string;
  sourceChain: Chain;
  sourceToken: string;
  sourceAmount: bigint;
  settledToken: string;
  settledAmount: bigint;
  timestamp: number;
}

export interface PayoutTransaction {
  id: string;
  batchId: string;
  recipient: string;
  amount: bigint;
  chain: Chain;
  token: string;
  txHash?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  error?: string;
}

export interface SettlementConfig {
  fheDecryptionDelay: number;
  minPayoutAmount: bigint;
  maxBatchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  fheDecryptionDelay: 1000,
  minPayoutAmount: 1n,
  maxBatchSize: 50,
  retryAttempts: 3,
  retryDelayMs: 5000
};
