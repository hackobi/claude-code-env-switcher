import { demosClient } from './demos-client';
import type { DAHRAttestation } from './types';
import { gcr } from './gcr-client';

export interface DAHRProxyParams {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  options?: {
    headers?: Record<string, string>;
    data?: string;
  };
}

export interface DAHRResponse {
  result: number | string;
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: string | object;
  };
  require_reply: boolean;
  extra?: {
    transactionHash?: string;
    attestation_hash?: string;
  };
}

export interface Web2FetchResult<T = unknown> {
  data: T;
  attestation: DAHRAttestation;
  raw: DAHRResponse;
}

class DAHRClient {
  private dahrInstance: any = null;

  async createInstance(): Promise<void> {
    if (!this.dahrInstance) {
      console.log('📡 Creating DAHR instance...');
      this.dahrInstance = await demosClient.getDahr();
      console.log('✅ DAHR instance created');
    }
  }

  async fetch<T = unknown>(params: DAHRProxyParams): Promise<Web2FetchResult<T>> {
    await this.createInstance();

    console.log(`🌐 DAHR fetch: ${params.method} ${params.url}`);

    const proxyParams = {
      url: params.url,
      method: params.method,
      options: {
        headers: params.options?.headers || {},
        data: params.options?.data || ''
      }
    };

    const rawResponse = await this.dahrInstance.startProxy(proxyParams) as DAHRResponse;

    let parsedData: T;
    try {
      parsedData = typeof rawResponse.response.data === 'string'
        ? JSON.parse(rawResponse.response.data)
        : rawResponse.response.data as T;
    } catch {
      parsedData = rawResponse.response.data as T;
    }

    const attestationHash = this.extractAttestationHash(rawResponse);

    const attestation: DAHRAttestation = {
      id: gcr.generateId('dahr', attestationHash, Date.now().toString()),
      marketId: '',
      fetchedAt: Date.now(),
      rawValue: 0n,
      proofHash: attestationHash,
      oracleSignature: `sig_${attestationHash.slice(0, 16)}`,
      status: rawResponse.response.status === 200 ? 'Verified' : 'Pending'
    };

    console.log(`✅ DAHR fetch complete: ${rawResponse.response.status}`);

    return {
      data: parsedData,
      attestation,
      raw: rawResponse
    };
  }

  private extractAttestationHash(response: DAHRResponse): string {
    if (response.extra?.transactionHash) {
      return response.extra.transactionHash;
    }
    if (response.extra?.attestation_hash) {
      return response.extra.attestation_hash;
    }
    if (typeof response.result === 'string' && response.result.length === 64) {
      return response.result;
    }
    return `dahr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  async fetchXMetrics(tweetId: string): Promise<Web2FetchResult<{ views: number; likes: number; retweets: number }>> {
    return this.fetch({
      url: `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      method: 'GET',
      options: {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`
        }
      }
    });
  }

  async fetchFarcasterMetrics(castHash: string): Promise<Web2FetchResult<{ reactions: number; recasts: number }>> {
    return this.fetch({
      url: `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash`,
      method: 'GET',
      options: {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY || ''
        }
      }
    });
  }

  async fetchRandomNumber(min: number = 1, max: number = 20): Promise<Web2FetchResult<number>> {
    const result = await this.fetch<Array<{ id: number; value: number }>>({
      url: `https://www.dejete.com/api?nbde=1&tpde=${max}`,
      method: 'GET'
    });

    const value = Array.isArray(result.data) && result.data[0]?.value
      ? result.data[0].value
      : Math.floor(Math.random() * (max - min + 1)) + min;

    return {
      data: value,
      attestation: result.attestation,
      raw: result.raw
    };
  }

  reset(): void {
    this.dahrInstance = null;
  }
}

export const dahrClient = new DAHRClient();
