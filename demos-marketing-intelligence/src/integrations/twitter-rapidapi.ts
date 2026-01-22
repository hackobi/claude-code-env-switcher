import axios from 'axios';
import { CRYPTO_INFLUENCERS, DEMOS_KEYWORDS } from './twitter';

export interface RapidAPITweet {
  tweet_id: string;
  text: string;
  created_at: string;
  author?: {
    id: string;
    name: string;
    screen_name: string;
  };
  retweet_count: number;
  favorite_count: number;
  reply_count: number;
  quote_count?: number;
}

/**
 * Represents a trending topic extracted from crypto Twitter
 */
export interface TrendingTopic {
  topic: string;
  context: string;
  relevanceToWeb3: string;
  tweetCount: number;
  engagementScore: number;
  sampleTweets: string[];
  hashtags: string[];
}

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  author_username?: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    urls?: Array<{ url: string; expanded_url: string }>;
  };
}

export interface UserTimeline {
  user: {
    id: string;
    name: string;
    screen_name: string;
    followers_count: number;
    friends_count: number;
    statuses_count: number;
  };
  timeline: RapidAPITweet[];
}

/**
 * Twitter API client using RapidAPI's Twitter API45
 * More cost-effective and easier to set up than official Twitter API
 */
export class TwitterRapidAPI {
  private apiKey: string;
  private baseUrl = 'https://twitter-api45.p.rapidapi.com';
  private host = 'twitter-api45.p.rapidapi.com';

  constructor(rapidApiKey: string) {
    this.apiKey = rapidApiKey;
  }

  /**
   * Get user timeline (tweets from a specific account)
   */
  async getUserTimeline(username: string, count = 100): Promise<Tweet[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/timeline.php`, {
        params: {
          screenname: username,
          count: Math.min(count, 200),
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.host,
        },
      });

      const timeline = response.data?.timeline || [];
      if (!Array.isArray(timeline)) {
        return [];
      }

      return timeline.map((tweet: any) => this.convertAPI45Tweet(tweet));
    } catch (error: any) {
      console.error(`Error fetching tweets for ${username}:`, error.message);
      return [];
    }
  }

  /**
   * Convert Twitter API45 tweet format to our standard format
   */
  private convertAPI45Tweet(tweet: any): Tweet {
    return {
      id: tweet.tweet_id || '',
      text: tweet.text || '',
      author_id: tweet.author?.rest_id || '',
      author_username: tweet.author?.screen_name || tweet.screen_name || undefined,
      created_at: tweet.created_at || new Date().toISOString(),
      public_metrics: {
        retweet_count: tweet.retweets || 0,
        reply_count: tweet.replies || 0,
        like_count: tweet.favorites || 0,
        quote_count: tweet.quotes || 0,
        impression_count: tweet.views ? parseInt(tweet.views) : undefined,
      },
      entities: tweet.entities,
    };
  }

  /**
   * Get user info
   */
  async getUserInfo(username: string): Promise<any | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/screenname.php`, {
        params: { screenname: username },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.host,
        },
      });

      return response.data || null;
    } catch (error: any) {
      console.error(`Error fetching user info for @${username}:`, error.message);
      return null;
    }
  }

  /**
   * Search tweets (using search endpoint)
   */
  async searchTweets(query: string, maxResults = 100): Promise<Tweet[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search.php`, {
        params: {
          query: query,
          search_type: 'Latest',
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.host,
        },
      });

      const timeline = response.data?.timeline || [];
      if (!Array.isArray(timeline)) {
        return [];
      }

      return timeline.slice(0, maxResults).map((tweet: any) => this.convertAPI45Tweet(tweet));
    } catch (error: any) {
      console.error('Error searching tweets:', error.message);
      return [];
    }
  }

  /**
   * Get specific tweet details
   */
  async getTweetInfo(tweetId: string): Promise<Tweet | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/tweet.php`, {
        params: { id: tweetId },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.host,
        },
      });

      if (!response.data) return null;

      return this.convertAPI45Tweet(response.data);
    } catch (error: any) {
      console.error(`Error fetching tweet ${tweetId}:`, error.message);
      return null;
    }
  }

  /**
   * Check if a tweet contains Demos-relevant keywords
   */
  isRelevantTweet(tweet: Tweet, keywords: string[]): boolean {
    const text = tweet.text.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Calculate engagement score for a tweet
   */
  calculateEngagementScore(tweet: Tweet): number {
    const metrics = tweet.public_metrics;
    return (
      metrics.like_count * 1 +
      metrics.retweet_count * 2 +
      metrics.reply_count * 1.5 +
      metrics.quote_count * 2
    );
  }

  /**
   * Monitor tweets from crypto influencers (for compatibility with TwitterMonitor)
   * Randomly samples from the full influencer list for variety
   */
  async monitorInfluencers(limit = 10): Promise<Tweet[]> {
    const allTweets: Tweet[] = [];

    // Randomly sample 15 influencers from the full list for better variety
    const shuffled = [...CRYPTO_INFLUENCERS].sort(() => Math.random() - 0.5);
    const influencersToCheck = shuffled.slice(0, 15);

    console.log(`  🐦 Checking ${influencersToCheck.length} influencers: ${influencersToCheck.slice(0, 5).join(', ')}...`);

    for (const username of influencersToCheck) {
      try {
        const tweets = await this.getUserTimeline(username, limit);
        allTweets.push(...tweets);

        // Rate limit protection (reduced for speed)
        await this.sleep(150);
      } catch (error: any) {
        console.error(`Error fetching tweets for ${username}:`, error.message);
      }
    }

    // Filter for high engagement tweets
    return allTweets.filter(
      tweet => tweet.public_metrics.like_count > 50
    );
  }

  /**
   * Search for tweets matching Demos keywords (for compatibility with TwitterMonitor)
   */
  async searchRelevantTweets(maxResults = 50): Promise<Tweet[]> {
    const query = DEMOS_KEYWORDS.slice(0, 3).join(' OR ');
    return this.searchTweets(query, maxResults);
  }

  /**
   * Extract trending topics from crypto/Web3 Twitter
   * Analyzes high-engagement tweets to identify what topics are trending
   */
  async extractTrendingTopics(limit = 5): Promise<TrendingTopic[]> {
    console.log('  📊 Extracting trending topics from crypto Twitter...');

    // Search queries for different Web3/crypto topics - expanded and more specific
    const trendQueries = [
      'crypto',
      'web3',
      'blockchain',
      'defi',
      'cross-chain OR multichain',
      'wallet',
      'airdrop',
      'L2 OR layer2',
      'chain abstraction',
      'account abstraction',
      'modular blockchain',
      'identity crypto',
      'onchain',
      'base chain',
      'ethereum',
      'solana ecosystem',
    ];

    const allTweets: Tweet[] = [];
    const topicMap = new Map<string, {
      tweets: Tweet[];
      totalEngagement: number;
      hashtags: Set<string>;
    }>();

    // Shuffle and pick 5 random queries for variety
    const shuffled = [...trendQueries].sort(() => Math.random() - 0.5);
    const selectedQueries = shuffled.slice(0, 5);
    console.log(`  🔍 Searching: ${selectedQueries.join(', ')}`);

    // Gather tweets from randomized search queries
    for (const query of selectedQueries) {
      try {
        const tweets = await this.searchTweets(query, 25);
        allTweets.push(...tweets);
        await this.sleep(150);
      } catch (error: any) {
        console.error(`  ⚠️  Search failed for "${query}":`, error.message);
      }
    }

    // Also gather from influencers to see what they're talking about
    const influencerTweets = await this.monitorInfluencers(5);
    allTweets.push(...influencerTweets);

    // Filter high-engagement tweets only
    const highEngagementTweets = allTweets.filter(
      tweet => this.calculateEngagementScore(tweet) > 100
    );

    // Extract topics from tweet content
    for (const tweet of highEngagementTweets) {
      const topics = this.extractTopicsFromTweet(tweet);

      for (const topic of topics) {
        const existing = topicMap.get(topic) || {
          tweets: [],
          totalEngagement: 0,
          hashtags: new Set<string>(),
        };

        existing.tweets.push(tweet);
        existing.totalEngagement += this.calculateEngagementScore(tweet);

        // Extract hashtags
        const hashtagMatches = tweet.text.match(/#\w+/g);
        if (hashtagMatches) {
          hashtagMatches.forEach(h => existing.hashtags.add(h.toLowerCase()));
        }

        topicMap.set(topic, existing);
      }
    }

    // Convert to TrendingTopic array and sort by engagement
    const trends: TrendingTopic[] = [];

    for (const [topic, data] of topicMap.entries()) {
      if (data.tweets.length >= 2) { // Require at least 2 tweets mentioning topic
        trends.push({
          topic,
          context: this.summarizeTopicContext(data.tweets),
          relevanceToWeb3: this.assessWeb3Relevance(topic, data.tweets),
          tweetCount: data.tweets.length,
          engagementScore: data.totalEngagement,
          sampleTweets: data.tweets.slice(0, 5).map(t => t.text.substring(0, 280)),
          hashtags: Array.from(data.hashtags).slice(0, 5),
        });
      }
    }

    // Sort by engagement and return top N
    return trends
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  }

  /**
   * Extract topic keywords from a tweet
   */
  private extractTopicsFromTweet(tweet: Tweet): string[] {
    const topics: string[] = [];
    const text = tweet.text.toLowerCase();

    // Topic patterns relevant to Demos' domain
    const topicPatterns = [
      { pattern: /cross[-\s]?chain/i, topic: 'cross-chain interoperability' },
      { pattern: /multi[-\s]?chain/i, topic: 'multichain' },
      { pattern: /chain abstraction/i, topic: 'chain abstraction' },
      { pattern: /account abstraction|aa\b/i, topic: 'account abstraction' },
      { pattern: /wallet/i, topic: 'wallets' },
      { pattern: /identity|did\b|ssi\b/i, topic: 'digital identity' },
      { pattern: /interop/i, topic: 'interoperability' },
      { pattern: /bridge|bridging/i, topic: 'cross-chain bridges' },
      { pattern: /defi/i, topic: 'DeFi' },
      { pattern: /l2|layer[\s-]?2/i, topic: 'Layer 2' },
      { pattern: /sdk|developer|devx/i, topic: 'developer experience' },
      { pattern: /modular/i, topic: 'modular blockchain' },
      { pattern: /rollup/i, topic: 'rollups' },
      { pattern: /solana/i, topic: 'Solana ecosystem' },
      { pattern: /ethereum|eth\b/i, topic: 'Ethereum ecosystem' },
      { pattern: /airdrop/i, topic: 'airdrops' },
      { pattern: /onchain|on-chain/i, topic: 'onchain activity' },
      { pattern: /web3/i, topic: 'Web3' },
      { pattern: /ai\s*agent|agent/i, topic: 'AI agents' },
      { pattern: /ai\s*identity/i, topic: 'AI identity' },
      { pattern: /agentic\s*commerce/i, topic: 'agentic commerce' },
    ];

    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Summarize what the conversation is about
   */
  private summarizeTopicContext(tweets: Tweet[]): string {
    // Get unique themes from the tweets
    const themes = new Set<string>();

    for (const tweet of tweets.slice(0, 5)) {
      // Extract key phrases
      const text = tweet.text;

      if (text.includes('announce') || text.includes('launch')) {
        themes.add('new launches/announcements');
      }
      if (text.includes('problem') || text.includes('issue') || text.includes('broken')) {
        themes.add('pain points being discussed');
      }
      if (text.includes('bullish') || text.includes('exciting')) {
        themes.add('positive sentiment');
      }
      if (text.includes('?')) {
        themes.add('questions being asked');
      }
      if (text.includes('compare') || text.includes('vs') || text.includes('versus')) {
        themes.add('comparisons being made');
      }
    }

    if (themes.size === 0) {
      return 'General discussion in the crypto community';
    }

    return Array.from(themes).join(', ');
  }

  /**
   * Assess how relevant a topic is to Web3/Demos
   * Core pillars: Cross-chain identity, Web2-Web3 interop (DAHR/TLS), Chain abstraction
   */
  private assessWeb3Relevance(topic: string, tweets: Tweet[]): string {
    const highRelevanceTopics = [
      // Cross-chain & identity
      'cross-chain', 'identity', 'interoperability', 'wallet',
      'chain abstraction', 'multichain', 'developer experience',
      'ai identity', 'agentic commerce',
      // Web2-Web3 interoperability (DAHR, TLS Notary, attestations)
      'web2', 'off-chain', 'offchain', 'attestation', 'tls', 'oracle',
      'data feed', 'verifiable', 'zkp', 'zero knowledge', 'proof',
      'real world', 'rwa', 'trustless data'
    ];

    const mediumRelevanceTopics = [
      'DeFi', 'Layer 2', 'rollups', 'Solana', 'Ethereum', 'bridges',
      'api', 'http', 'automation', 'agent', 'ai agent', 'bot',
      'infrastructure', 'protocol', 'sdk'
    ];

    const topicLower = topic.toLowerCase();

    if (highRelevanceTopics.some(t => topicLower.includes(t.toLowerCase()))) {
      return 'Directly relevant to Demos - core value proposition';
    }

    if (mediumRelevanceTopics.some(t => topicLower.includes(t.toLowerCase()))) {
      return 'Related ecosystem topic - can provide Demos perspective';
    }

    return 'General Web3 topic - engage if natural angle exists';
  }

  /**
   * Get trending topics specifically relevant to Demos' value props
   */
  async getDemosRelevantTrends(): Promise<TrendingTopic[]> {
    const allTrends = await this.extractTrendingTopics(10);

    // Filter for topics where Demos has something valuable to say
    // Core pillars: Cross-chain identity, Web2-Web3 interop (DAHR/TLS), Chain abstraction
    const demosRelevantKeywords = [
      // Cross-chain & identity
      'cross-chain', 'multichain', 'identity', 'wallet', 'interop',
      'chain abstraction', 'sdk', 'developer', 'bridge', 'l2', 'layer 2',
      'ai identity', 'agentic commerce',
      // Web2-Web3 interoperability
      'web2', 'web3', 'off-chain', 'offchain', 'attestation', 'tls',
      'oracle', 'data feed', 'verifiable', 'zkp', 'proof', 'rwa',
      // AI agents
      'agent', 'ai agent', 'autonomous', 'automation'
    ];

    return allTrends.filter(trend => {
      const topicLower = trend.topic.toLowerCase();
      return demosRelevantKeywords.some(kw => topicLower.includes(kw)) ||
        trend.relevanceToWeb3.includes('Directly relevant');
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterRapidAPI;
