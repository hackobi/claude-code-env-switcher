import { dahrClient, type Web2FetchResult } from '../shared-lib/dahr-client';
import type { MetricTarget, FetchResult, Web2Platform } from './types';

interface XMetrics {
  views?: number;
  likes?: number;
  retweets?: number;
  public_metrics?: {
    impression_count?: number;
    like_count?: number;
    retweet_count?: number;
  };
}

interface FarcasterMetrics {
  reactions?: { count?: number };
  recasts?: { count?: number };
  cast?: {
    reactions?: { likes_count?: number; recasts_count?: number };
  };
}

interface GitHubMetrics {
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
}

export class MetricFetcher {
  private twitterBearerToken: string;
  private neynarApiKey: string;
  private githubToken: string;

  constructor(config: {
    twitterBearerToken?: string;
    neynarApiKey?: string;
    githubToken?: string;
  } = {}) {
    this.twitterBearerToken = config.twitterBearerToken || process.env.TWITTER_BEARER_TOKEN || '';
    this.neynarApiKey = config.neynarApiKey || process.env.NEYNAR_API_KEY || '';
    this.githubToken = config.githubToken || process.env.GITHUB_TOKEN || '';
  }

  async fetch(target: MetricTarget): Promise<FetchResult> {
    try {
      switch (target.platform) {
        case 'X':
          return await this.fetchXMetrics(target);
        case 'Farcaster':
          return await this.fetchFarcasterMetrics(target);
        case 'GitHub':
          return await this.fetchGitHubMetrics(target);
        case 'YouTube':
          return await this.fetchYouTubeMetrics(target);
        default:
          return { success: false, error: `Unsupported platform: ${target.platform}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fetch failed';
      console.error(`❌ Metric fetch failed for ${target.platform}:${target.sourceId}: ${message}`);
      return { success: false, error: message };
    }
  }

  private async fetchXMetrics(target: MetricTarget): Promise<FetchResult> {
    console.log(`🐦 Fetching X metrics for tweet: ${target.sourceId}`);

    const result = await dahrClient.fetch<XMetrics>({
      url: `https://api.twitter.com/2/tweets/${target.sourceId}?tweet.fields=public_metrics`,
      method: 'GET',
      options: {
        headers: {
          'Authorization': `Bearer ${this.twitterBearerToken}`
        }
      }
    });

    const metrics = result.data;
    let value: bigint;

    switch (target.metricType) {
      case 'views':
        value = BigInt(metrics.public_metrics?.impression_count || metrics.views || 0);
        break;
      case 'likes':
        value = BigInt(metrics.public_metrics?.like_count || metrics.likes || 0);
        break;
      case 'retweets':
        value = BigInt(metrics.public_metrics?.retweet_count || metrics.retweets || 0);
        break;
      default:
        value = 0n;
    }

    console.log(`✅ X ${target.metricType}: ${value}`);

    return {
      success: true,
      value,
      attestation: result.attestation,
      rawResponse: result.raw
    };
  }

  private async fetchFarcasterMetrics(target: MetricTarget): Promise<FetchResult> {
    console.log(`🟣 Fetching Farcaster metrics for cast: ${target.sourceId}`);

    const result = await dahrClient.fetch<FarcasterMetrics>({
      url: `https://api.neynar.com/v2/farcaster/cast?identifier=${target.sourceId}&type=hash`,
      method: 'GET',
      options: {
        headers: {
          'api_key': this.neynarApiKey
        }
      }
    });

    const metrics = result.data;
    let value: bigint;

    switch (target.metricType) {
      case 'reactions':
      case 'likes':
        value = BigInt(metrics.cast?.reactions?.likes_count || metrics.reactions?.count || 0);
        break;
      case 'retweets':
        value = BigInt(metrics.cast?.reactions?.recasts_count || metrics.recasts?.count || 0);
        break;
      default:
        value = 0n;
    }

    console.log(`✅ Farcaster ${target.metricType}: ${value}`);

    return {
      success: true,
      value,
      attestation: result.attestation,
      rawResponse: result.raw
    };
  }

  private async fetchGitHubMetrics(target: MetricTarget): Promise<FetchResult> {
    console.log(`🐙 Fetching GitHub metrics for repo: ${target.sourceId}`);

    const result = await dahrClient.fetch<GitHubMetrics>({
      url: `https://api.github.com/repos/${target.sourceId}`,
      method: 'GET',
      options: {
        headers: {
          'Authorization': this.githubToken ? `Bearer ${this.githubToken}` : '',
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    });

    const metrics = result.data;
    let value: bigint;

    switch (target.metricType) {
      case 'stars':
        value = BigInt(metrics.stargazers_count || 0);
        break;
      case 'forks':
        value = BigInt(metrics.forks_count || 0);
        break;
      default:
        value = 0n;
    }

    console.log(`✅ GitHub ${target.metricType}: ${value}`);

    return {
      success: true,
      value,
      attestation: result.attestation,
      rawResponse: result.raw
    };
  }

  private async fetchYouTubeMetrics(target: MetricTarget): Promise<FetchResult> {
    console.log(`📺 Fetching YouTube metrics for video: ${target.sourceId}`);
    
    return {
      success: false,
      error: 'YouTube API integration pending - requires OAuth setup'
    };
  }
}

export const metricFetcher = new MetricFetcher();
