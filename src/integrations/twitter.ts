import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
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

export interface Trend {
  name: string;
  tweet_volume: number;
  url?: string;
}

export const CRYPTO_INFLUENCERS = [
  // ═══════════════════════════════════════════════════════════════
  // TOP KAITO LEADERBOARD INFLUENCERS (Verified Active)
  // ═══════════════════════════════════════════════════════════════
  'aixbt_agent',       // AI agent influencer
  'zacxbt',            // Crypto researcher
  'blknoiz06',         // Crypto analyst
  'hosseeb',           // Paradigm
  'jessepollak',       // Base lead at Coinbase
  'brian_armstrong',   // Coinbase CEO
  'mert',              // Helius/Solana
  'Route2FI',          // DeFi educator
  'farokh',            // NFT/crypto influencer
  'gainzy222',         // Crypto trader
  'tulipking',         // Crypto analyst
  'mdudas',            // The Block
  'orangie',           // Crypto community
  'shayne_coplan',     // Polymarket founder
  'serpinxbt',         // Crypto researcher
  '0xJeff',            // DeFi researcher
  'primo_data',        // Data analyst
  'FabianoSolana',     // Solana ecosystem
  'SolJakey',          // Solana community
  'ripchillpill',      // Crypto trader
  'aaronjmars',        // Crypto researcher
  'waleswoosh',        // Crypto influencer
  'TimHaldorsson',     // Lunar Digital
  'DeRonin_',          // Crypto researcher
  'DeeZe',             // NFT/crypto
  'Deebs_DeFi',        // DeFi analyst
  'NTmoney',           // Crypto investor
  'thenarrator',       // Crypto content
  'xerocooleth',       // Crypto researcher
  'chessxyz',          // Crypto analyst
  'chesus',            // Crypto community
  'datadashboards',    // Data analytics

  // ═══════════════════════════════════════════════════════════════
  // ETHEREUM & LAYER 2 ECOSYSTEM
  // ═══════════════════════════════════════════════════════════════
  'VitalikButerin',    // Ethereum co-founder
  'sassal0x',          // Ethereum educator
  'evan_van_ness',     // Week in Ethereum News
  'hudsonjameson',     // Ethereum Foundation
  'djrtwo',            // Ethereum core dev (Danny Ryan)
  'prestonvanloon',    // Ethereum core dev
  'TimBeiko',          // Ethereum core dev
  'peter_szilagyi',    // Geth lead
  'lightclients',      // Light client researcher

  // Base / Coinbase Ecosystem
  'BuildOnBase',       // Base official
  'coinbase',          // Coinbase

  // Optimism
  'optimismFND',       // Optimism official
  'karl_dot_tech',     // Optimism co-founder

  // Arbitrum
  'arbitrum',          // Arbitrum official
  'OffchainLabs',      // Arbitrum team

  // ═══════════════════════════════════════════════════════════════
  // SOLANA ECOSYSTEM
  // ═══════════════════════════════════════════════════════════════
  'aeyakovenko',       // Solana co-founder (Anatoly)
  'rajgokal',          // Solana co-founder
  'armaniferrante',    // Anchor framework creator
  'solana',            // Solana official
  'JupiterExchange',   // Jupiter aggregator
  'phantom',           // Phantom wallet
  'solflare_wallet',   // Solflare wallet
  'xNFT_Backpack',     // Backpack/Mad Lads

  // ═══════════════════════════════════════════════════════════════
  // THOUGHT LEADERS & VCS
  // ═══════════════════════════════════════════════════════════════
  'naval',             // AngelList, philosophy
  'balajis',           // Former Coinbase CTO
  'punk6529',          // NFT collector/thought leader
  'MessariCrypto',     // Messari
  'twobitidiot',       // Messari founder (Ryan Selkis)
  'cburniske',         // Placeholder VC
  'novogratz',         // Galaxy Digital CEO
  'APompliano',        // Bitcoin advocate
  'ljin18',            // a16z crypto (Li Jin)
  'cdixon',            // a16z crypto partner
  'danrobinson',       // Paradigm researcher
  'matthuang',         // Paradigm co-founder
  'katie_haun',        // Haun Ventures
  'KyleSamani',        // Multicoin Capital
  'TusharJain_',       // Multicoin Capital
  'dragonfly_xyz',     // Dragonfly Capital
  'tomshaughnessy_',   // Delphi Digital
  'Rewkang',           // Alliance DAO

  // ═══════════════════════════════════════════════════════════════
  // DEFI BUILDERS & PROTOCOLS
  // ═══════════════════════════════════════════════════════════════
  'rleshner',          // Compound founder
  'StaniKulechov',     // Aave founder
  'haydenzadams',      // Uniswap founder
  'Uniswap',           // Uniswap official
  'AaveAave',          // Aave official
  'MakerDAO',          // MakerDAO official
  'LidoFinance',       // Lido
  'eigenlayer',        // EigenLayer
  'sreeramkannan',     // EigenLayer founder
  'bertcmiller',       // Flashbots
  'SushiSwap',         // SushiSwap
  'CurveFinance',      // Curve Finance
  '1inch',             // 1inch aggregator
  'paraswap',          // ParaSwap
  'GMX_IO',            // GMX
  'penaboroshdlefi',       // Pendle Finance
  'Hyperliquid',       // Hyperliquid

  // ═══════════════════════════════════════════════════════════════
  // CROSS-CHAIN & INTEROPERABILITY (HIGHLY RELEVANT)
  // ═══════════════════════════════════════════════════════════════
  'LayerZero_Labs',    // LayerZero
  'PrimordialAA',      // LayerZero founder (Bryan Pellegrino)
  'wormhole',          // Wormhole
  'axelarcore',        // Axelar
  'chainlink',         // Chainlink (CCIP)
  'SergeyNazarov',     // Chainlink founder
  'cosmos',            // Cosmos ecosystem
  'IBCProtocol',       // IBC Protocol
  '0xPolygon',         // Polygon
  'Starknet',          // StarkNet
  'zksync',            // zkSync
  'SocketProtocol',    // Socket (bridge aggregator)
  'AcrossProtocol',    // Across bridge
  'HopProtocol',       // Hop Protocol
  'SynapseProtocol',   // Synapse bridge

  // ═══════════════════════════════════════════════════════════════
  // IDENTITY, WALLETS & ACCOUNT ABSTRACTION (CORE RELEVANCE)
  // ═══════════════════════════════════════════════════════════════
  'rainbowdotme',      // Rainbow wallet
  'zerion',            // Zerion wallet
  'safe',              // Safe (multisig)
  'argentHQ',          // Argent wallet
  'MetaMask',          // MetaMask
  'TrustWallet',       // Trust Wallet
  'Ledger',            // Ledger
  'Trezor',            // Trezor

  // Account Abstraction
  'erc4337',           // ERC-4337 official
  'stackup_fi',        // Stackup (AA bundler)
  'biconomy',          // Biconomy (AA)
  'zerodev_app',       // ZeroDev (AA SDK)
  'AlchemyPlatform',   // Alchemy (includes AA)

  // Identity & DIDs
  'ensdomains',        // ENS official
  'nicksdjohnson',     // ENS lead
  'SpruceID',          // Spruce (Sign-in with Ethereum)
  'ceramicnetwork',    // Ceramic (DIDs)
  'worldcoin',         // Worldcoin (identity)
  'Polygon_ID',        // Polygon ID
  'gitcoin',           // Gitcoin Passport
  'LensProtocol',      // Lens Protocol
  'dwr',               // Dan Romero, Farcaster
  'varunsrin',         // Farcaster co-founder

  // ═══════════════════════════════════════════════════════════════
  // INFRASTRUCTURE & DEVELOPER TOOLS
  // ═══════════════════════════════════════════════════════════════
  'infura_io',         // Infura
  'QuickNode',         // QuickNode
  'graphprotocol',     // The Graph
  'TenderlyApp',       // Tenderly
  'HardhatHQ',         // Hardhat
  'foundry_rs',        // Foundry
  'wagmi_sh',          // wagmi
  'viem_sh',           // viem
  'privy_io',          // Privy (auth)
  'dynamic_xyz',       // Dynamic (auth)

  // ═══════════════════════════════════════════════════════════════
  // SECURITY & RESEARCH
  // ═══════════════════════════════════════════════════════════════
  'samczsun',          // Security researcher
  'trailofbits',       // Trail of Bits
  'OpenZeppelin',      // OpenZeppelin
  'CertiK',            // CertiK
  'chainalysis',       // Chainalysis
  'SlowMist_Team',     // SlowMist
  'immunefi',          // Immunefi

  // ═══════════════════════════════════════════════════════════════
  // MEDIA & EDUCATORS
  // ═══════════════════════════════════════════════════════════════
  'BanklessHQ',        // Bankless
  'RyanSAdams',        // Bankless co-founder
  'TrustlessState',    // Bankless co-founder (David Hoffman)
  'thedefiant_',       // The Defiant
  'WuBlockchain',      // Wu Blockchain
  'DefiIgnas',         // DeFi educator
  'CryptoCobain',      // Cobie
  'AltcoinGordon',     // Crypto educator
  'CryptoKaduna',      // Crypto educator
  'DefiDad',           // DeFi Dad
  'unchaboroshinedpod',    // Unchained Podcast

  // ═══════════════════════════════════════════════════════════════
  // EMERGING CHAINS & ECOSYSTEMS
  // ═══════════════════════════════════════════════════════════════
  'SuiNetwork',        // Sui
  'Aptos',             // Aptos
  'SeiNetwork',        // Sei Network
  'monad_xyz',         // Monad
  'CelestiaOrg',       // Celestia (DA layer)
  'eigen_da',          // EigenDA
  'AvailProject',      // Avail
  'Scroll_ZKP',        // Scroll
  'Blast_L2',          // Blast

  // ═══════════════════════════════════════════════════════════════
  // AI x CRYPTO (EMERGING RELEVANCE)
  // ═══════════════════════════════════════════════════════════════
  'ritualnet',         // Ritual (AI infra)
  'opentensor',        // Bittensor
  'rendernetwork',     // Render Network
  'akaboroshhnetwork',     // Akash Network
  'ionet_official',    // io.net
  'autonolas',         // Autonolas
  'MorpheusAIs',       // Morpheus AI
  'virtuals_io',       // Virtuals Protocol
  'ai16zdao',          // AI16Z DAO
];

export const DEMOS_KEYWORDS = [
  // Core Demos Value Props
  'cross-chain',
  'cross chain',
  'chain abstraction',
  'wallet fragmentation',
  'blockchain identity',
  'decentralized identity',
  'decentralisation',
  'decentralization',

  // Standards & Protocols
  'ERC-8004',          // Agent identity standard
  'erc8004',
  'x402',              // Payment protocol
  'ERC-4337',          // Account abstraction
  'account abstraction',
  'did',               // Decentralized identifiers

  // Infrastructure
  'multi-chain',
  'multichain',
  'omnichain',
  'blockchain interoperability',
  'interoperability',
  'intent-based',
  'intents',

  // UX & Developer Focus
  'web3 ux',
  'crypto ux',
  'developer experience',
  'wallet experience',
  'crypto onboarding',
  'gasless',
  'gas abstraction',

  // Identity
  'unified identity',
  'portable identity',
  'self-sovereign identity',
  'ssi',
];

export class TwitterMonitor {
  private client: TwitterApi;
  private readOnlyClient: TwitterApi;

  constructor(bearerToken: string, credentials?: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    accessSecret: string;
  }) {
    this.readOnlyClient = new TwitterApi(bearerToken);

    if (credentials) {
      this.client = new TwitterApi(credentials);
    } else {
      this.client = this.readOnlyClient;
    }
  }

  /**
   * Monitor tweets from crypto influencers
   */
  async monitorInfluencers(limit = 10): Promise<Tweet[]> {
    const allTweets: Tweet[] = [];

    try {
      for (const username of CRYPTO_INFLUENCERS) {
        try {
          const user = await this.readOnlyClient.v2.userByUsername(username);

          if (!user.data) continue;

          const timeline = await this.readOnlyClient.v2.userTimeline(user.data.id, {
            max_results: limit,
            'tweet.fields': ['created_at', 'public_metrics', 'entities'],
          });

          if (timeline.data && timeline.data.data) {
            allTweets.push(...(timeline.data.data as any[]));
          }

          // Rate limit protection
          await this.sleep(1000);
        } catch (error: any) {
          console.error(`Error fetching tweets for ${username}:`, error.message);
        }
      }

      // Filter for high engagement tweets
      return allTweets.filter(
        tweet => tweet.public_metrics.like_count > 50
      );
    } catch (error: any) {
      console.error('Error monitoring influencers:', error.message);
      return [];
    }
  }

  /**
   * Generic tweet search with custom query
   */
  async searchTweets(query: string, maxResults = 100): Promise<Tweet[]> {
    try {
      const tweets = await this.readOnlyClient.v2.search(query, {
        max_results: Math.min(maxResults, 100), // Twitter API limit
        'tweet.fields': ['created_at', 'public_metrics', 'entities', 'author_id'],
      });

      return (tweets.data.data as any[]) || [];
    } catch (error: any) {
      console.error('Error searching tweets:', error.message);
      return [];
    }
  }

  /**
   * Search for tweets matching Demos keywords
   */
  async searchRelevantTweets(maxResults = 50): Promise<Tweet[]> {
    const query = DEMOS_KEYWORDS.slice(0, 5).map(kw => `"${kw}"`).join(' OR ');
    return this.searchTweets(query, maxResults);
  }

  /**
   * Get trending topics (requires elevated access)
   */
  async getTrends(woeid = 1): Promise<Trend[]> {
    try {
      // Note: This requires Twitter API v1.1 trends endpoint
      // May need elevated access
      return [];
    } catch (error: any) {
      console.error('Error fetching trends:', error.message);
      return [];
    }
  }

  /**
   * Get user information
   */
  async getUser(username: string): Promise<UserV2 | null> {
    try {
      const user = await this.readOnlyClient.v2.userByUsername(username);
      return user.data || null;
    } catch (error: any) {
      console.error(`Error fetching user ${username}:`, error.message);
      return null;
    }
  }

  /**
   * Check if a tweet contains Demos-relevant keywords
   */
  isRelevantTweet(tweet: Tweet): boolean {
    const text = tweet.text.toLowerCase();
    return DEMOS_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterMonitor;
