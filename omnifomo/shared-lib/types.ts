export type SourceContext = 
  | 'Web2_X' 
  | 'Web2_Farcaster' 
  | 'Web2_YouTube' 
  | 'XM_Ethereum' 
  | 'XM_Base' 
  | 'XM_Solana';

export type MetricType = 'views' | 'likes' | 'retweets' | 'bridgeVolume' | 'txCount' | 'tvl';

export type MarketStatus = 'Open' | 'Locked' | 'Resolving' | 'Resolved' | 'Disputed';

export type BetDirection = 'OVER' | 'UNDER';

export type Chain = 'Ethereum' | 'Base' | 'Solana' | 'Arbitrum' | 'Polygon';

export interface TargetMetric {
  type: MetricType;
  sourceId: string;
}

export interface MarketResolution {
  finalValue: bigint;
  winningDirection: BetDirection;
  attestationHash: string;
  resolvedAt: number;
}

export interface PoolState {
  totalOverStake: bigint;
  totalUnderStake: bigint;
  participantCount: number;
}

export interface MomentMarket {
  id: string;
  sourceContext: SourceContext;
  targetMetric: TargetMetric;
  threshold: bigint;
  deadline: number;
  status: MarketStatus;
  resolution: MarketResolution | null;
  poolState: PoolState;
}

export interface UserPosition {
  id: string;
  userId: string;
  marketId: string;
  stakeAmount: bigint;
  direction: BetDirection;
  sourceChain: Chain;
  depositToken: string;
  createdAt: number;
  claimed: boolean;
}

export interface DAHRAttestation {
  id: string;
  marketId: string;
  fetchedAt: number;
  rawValue: bigint;
  proofHash: string;
  oracleSignature: string;
  status: 'Pending' | 'Verified' | 'Challenged' | 'Finalized';
}

export interface GCRDelta<T> {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  id: string;
  data: Partial<T>;
  timestamp: number;
  signature?: string;
}

export interface Intent<P = unknown> {
  type: string;
  params: P;
  sourceChain: Chain;
  sender: string;
  nonce: number;
  gasTankId?: string;
}
