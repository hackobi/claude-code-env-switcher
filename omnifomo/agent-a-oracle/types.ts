import type { SourceContext, DAHRAttestation } from '../shared-lib/types';

export type Web2Platform = 'X' | 'Farcaster' | 'YouTube' | 'GitHub';

export interface MetricTarget {
  platform: Web2Platform;
  sourceId: string;
  metricType: 'views' | 'likes' | 'retweets' | 'reactions' | 'stars' | 'forks';
}

export interface ScheduledFetch {
  id: string;
  marketId: string;
  target: MetricTarget;
  deadline: number;
  status: 'scheduled' | 'fetching' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
}

export interface FetchResult {
  success: boolean;
  value?: bigint;
  attestation?: DAHRAttestation;
  error?: string;
  rawResponse?: any;
}

export interface OracleConfig {
  pollIntervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
  twitterBearerToken?: string;
  neynarApiKey?: string;
  githubToken?: string;
}

export interface AttestationProof {
  marketId: string;
  fetchedValue: bigint;
  proofHash: string;
  tlsSessionId: string;
  timestamp: number;
  oracleAddress: string;
  signature: string;
}

export const PLATFORM_TO_CONTEXT: Record<Web2Platform, SourceContext> = {
  'X': 'Web2_X',
  'Farcaster': 'Web2_Farcaster',
  'YouTube': 'Web2_YouTube',
  'GitHub': 'Web2_X'
};
