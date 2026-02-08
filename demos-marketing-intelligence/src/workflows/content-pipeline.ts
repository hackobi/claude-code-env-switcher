import TypefullyClient from '../integrations/typefully';
import TwitterRapidAPI, { TrendingTopic } from '../integrations/twitter-rapidapi';
import { CRYPTO_INFLUENCERS, DEMOS_KEYWORDS, Tweet } from '../integrations/twitter';
import LinearIntegration, { LinearTask } from '../integrations/linear';
import AIContentGenerator, { GenerationContext } from '../content/ai-generator';
import { EnhancedAIContentGenerator, EnhancedGeneratedContent } from '../content/ai-generator-enhanced';
import FallbackContentGenerator from '../content/fallback-generator';
import RelevanceScorer, { ScoredContent } from '../content/relevance-scorer';
import BrandingAgent from '../agents/branding-agent';
import ImageGenerator from '../visual/image-generator';
import ImagenGenerator from '../visual/imagen-generator';
import { BrandVoiceLearner } from '../learning/brand-voice-learner';
import ProfileStorage from '../learning/profile-storage';
import { ContentDatabase, getDatabase } from '../database';

export interface PipelineConfig {
  maxDraftsPerRun: number;
  minRelevanceScore: number;
  enableTwitterMonitoring: boolean;
  enableLinearIntegration: boolean;
  enableVisualGeneration: boolean;
  enableBrandReview: boolean;
  enableBrandLearning: boolean;
  brandLearnFromParagraph: boolean;
  brandProfileUpdateHours: number;
  dryRun: boolean;
  useImagen: boolean;           // Use Google Imagen instead of DALL-E
  useDatabase: boolean;         // Use SQLite database for content history
  useEnhancedAI: boolean;       // Use enhanced multi-step reasoning AI
  googleCloudProject?: string;  // Google Cloud project for Imagen
}

export interface PipelineResult {
  draftsCreated: number;
  itemsProcessed: number;
  skipped: number;
  errors: string[];
  topDrafts: any[];
}

/**
 * Main content pipeline orchestrator
 * Monitors sources, scores relevance, generates content, sends to Typefully
 *
 * Now with:
 * - SQLite database for content history and deduplication
 * - Google Imagen support (optional, falls back to DALL-E)
 */
export class ContentPipeline {
  private typefully: TypefullyClient;
  private twitter: TwitterRapidAPI;
  private linear: LinearIntegration;
  private aiGenerator: AIContentGenerator;
  private enhancedAIGenerator: EnhancedAIContentGenerator;
  private fallbackGenerator: FallbackContentGenerator;
  private scorer: RelevanceScorer;
  private brandingAgent: BrandingAgent;
  private imageGenerator: ImageGenerator;
  private imagenGenerator: ImagenGenerator | null = null;
  private brandLearner: BrandVoiceLearner;
  private profileStorage: ProfileStorage;
  private db: ContentDatabase | null = null;
  private config: PipelineConfig;
  private pipelineRunId: number | null = null;

  constructor(
    typefullyApiKey: string,
    _twitterBearerToken: string, // Deprecated - using RapidAPI instead
    linearApiKey: string,
    linearTeamId: string,
    anthropicApiKey: string,
    openaiApiKey: string,
    rapidApiKey: string,
    config: Partial<PipelineConfig> = {}
  ) {
    this.typefully = new TypefullyClient(typefullyApiKey, process.env.TYPEFULLY_ACCOUNT_ID);
    this.twitter = new TwitterRapidAPI(rapidApiKey); // Use RapidAPI instead of official Twitter API
    this.linear = new LinearIntegration(linearApiKey, linearTeamId);
    this.aiGenerator = new AIContentGenerator(anthropicApiKey);
    this.enhancedAIGenerator = new EnhancedAIContentGenerator(anthropicApiKey);
    this.fallbackGenerator = new FallbackContentGenerator();
    this.scorer = new RelevanceScorer();
    this.brandingAgent = new BrandingAgent(anthropicApiKey);
    this.imageGenerator = new ImageGenerator(openaiApiKey);
    // Use RapidAPI for brand learning (more cost-effective than official Twitter API)
    this.brandLearner = new BrandVoiceLearner(anthropicApiKey, rapidApiKey);
    this.profileStorage = new ProfileStorage();

    this.config = {
      maxDraftsPerRun: config.maxDraftsPerRun || 15,
      minRelevanceScore: config.minRelevanceScore || 0.4, // Lowered from 0.6 for better conversion
      enableTwitterMonitoring: config.enableTwitterMonitoring ?? true,
      enableLinearIntegration: config.enableLinearIntegration ?? true,
      enableVisualGeneration: config.enableVisualGeneration ?? true,
      enableBrandReview: config.enableBrandReview ?? true,
      enableBrandLearning: config.enableBrandLearning ?? true,
      brandLearnFromParagraph: config.brandLearnFromParagraph ?? true,
      brandProfileUpdateHours: config.brandProfileUpdateHours || 168, // Weekly by default
      dryRun: config.dryRun ?? false,
      useImagen: config.useImagen ?? false,
      useDatabase: config.useDatabase ?? true,
      useEnhancedAI: config.useEnhancedAI ?? false, // Use enhanced multi-step reasoning AI
      googleCloudProject: config.googleCloudProject,
    };

    // Initialize database if enabled
    if (this.config.useDatabase) {
      this.db = getDatabase();
      console.log('📊 Database enabled for content history');
    }

    // Initialize Imagen if enabled and configured
    if (this.config.useImagen) {
      this.imagenGenerator = new ImagenGenerator({
        projectId: this.config.googleCloudProject,
      });
      if (this.imagenGenerator.isConfigured()) {
        console.log('🎨 Google Imagen enabled for image generation');
      } else {
        console.log('⚠️  Google Imagen not configured, falling back to DALL-E');
        this.imagenGenerator = null;
      }
    }
  }

  /**
   * Run the full content pipeline
   */
  async run(): Promise<PipelineResult> {
    console.log('🚀 Starting content pipeline...\n');

    // Start pipeline run tracking
    if (this.db) {
      this.pipelineRunId = this.db.startPipelineRun();
      console.log(`📊 Pipeline run #${this.pipelineRunId} started\n`);
    }

    // Initialize brand voice learning
    if (this.config.enableBrandLearning) {
      await this.initializeBrandVoice();
    }

    const result: PipelineResult = {
      draftsCreated: 0,
      itemsProcessed: 0,
      skipped: 0,
      errors: [],
      topDrafts: [],
    };

    try {
      // Step 1: Gather content from all sources (trends + Linear tasks)
      console.log('📊 Step 1: Gathering content from sources...');
      const sources = await this.gatherSources();
      result.itemsProcessed = sources.trendingTopics.length + sources.tasks.length;
      console.log(`  • Found ${sources.trendingTopics.length} trending topics`);
      console.log(`  • Found ${sources.tasks.length} completed tasks`);
      console.log(`  • Monitored ${sources.tweets.length} tweets for trend analysis`);

      // Store tweets and tasks in database (for analytics, not for replies)
      if (this.db) {
        this.storeTweetsInDatabase(sources.tweets);
        this.storeTasksInDatabase(sources.tasks);
        console.log(`  • Stored in database for history\n`);
      } else {
        console.log('');
      }

      // Step 2: Score trending topics and tasks for relevance
      console.log('🎯 Step 2: Scoring content relevance...');
      const scoredContent = this.scoreAllContent(sources);
      const highQuality = this.scorer.filterHighQuality(
        scoredContent,
        this.config.minRelevanceScore
      );
      console.log(`  • ${highQuality.length} items meet quality threshold\n`);

      // Step 3: Generate ORIGINAL drafts based on trends and tasks
      console.log('✍️  Step 3: Generating original AI content...');
      const drafts = await this.generateDrafts(highQuality, sources.demosContext);
      console.log(`  • Generated ${drafts.length} original draft pieces\n`);

      // Step 4: Send to Typefully
      if (!this.config.dryRun && drafts.length > 0) {
        console.log('📤 Step 4: Sending to Typefully...');
        const sent = await this.sendToTypefully(drafts);
        result.draftsCreated = sent;
        result.topDrafts = drafts.slice(0, 5);
        console.log(`  • Created ${sent} drafts in Typefully\n`);
      } else if (this.config.dryRun) {
        console.log('🔍 Dry run mode - skipping Typefully upload\n');
        result.topDrafts = drafts;
      }

      result.skipped = result.itemsProcessed - result.draftsCreated;

      // Complete pipeline run in database
      if (this.db && this.pipelineRunId) {
        this.db.completePipelineRun(this.pipelineRunId, {
          tweets: sources.tweets.length,
          tasks: sources.tasks.length,
          drafts: result.draftsCreated,
          errors: result.errors.length > 0 ? result.errors : undefined,
        });
      }

      console.log('✅ Pipeline completed successfully!\n');
      this.printSummary(result);

      return result;
    } catch (error: any) {
      console.error('❌ Pipeline error:', error.message);
      result.errors.push(error.message);

      // Record error in database
      if (this.db && this.pipelineRunId) {
        this.db.completePipelineRun(this.pipelineRunId, {
          tweets: 0,
          tasks: 0,
          drafts: 0,
          errors: [error.message],
        });
      }

      return result;
    }
  }

  /**
   * Gather content from all enabled sources
   *
   * NEW APPROACH: Instead of monitoring tweets to respond to,
   * we extract TRENDING TOPICS and generate ORIGINAL Demos content
   * that participates in those conversations.
   *
   * OPTIMIZED: Run Twitter and Linear gathering in PARALLEL for speed.
   */
  private async gatherSources() {
    const tweets: Tweet[] = [];
    const tasks: LinearTask[] = [];
    const trendingTopics: TrendingTopic[] = [];
    let demosContext: any = {
      recentShips: [],
      valueProp: 'Cross-chain identity and interoperability infrastructure',
      upcomingFeatures: [],
    };

    // Run Twitter AND Linear gathering in parallel
    const gatherPromises: Promise<void>[] = [];

    // Twitter gathering (all calls run in parallel)
    if (this.config.enableTwitterMonitoring) {
      gatherPromises.push((async () => {
        try {
          console.log('  📈 Extracting trending topics from crypto Twitter...');

          // Run ALL Twitter calls in parallel (trends + influencers + search)
          const [trends, influencerTweets, searchTweets] = await Promise.all([
            this.twitter.getDemosRelevantTrends(),
            this.twitter.monitorInfluencers(10),
            this.twitter.searchRelevantTweets(30),
          ]);

          trendingTopics.push(...trends);
          console.log(`  • Found ${trends.length} relevant trending topics`);

          tweets.push(...influencerTweets, ...searchTweets);

          // Deduplicate by tweet ID
          const uniqueTweets = Array.from(
            new Map(tweets.map(t => [t.id, t])).values()
          );

          tweets.length = 0;
          tweets.push(...uniqueTweets);
        } catch (error: any) {
          console.error('  ⚠️  Twitter monitoring failed:', error.message);
        }
      })());
    }

    // Linear gathering (runs in parallel with Twitter)
    if (this.config.enableLinearIntegration) {
      gatherPromises.push((async () => {
        try {
          const [completed, shipped, upcoming] = await Promise.all([
            this.linear.getCompletedTasks(7),
            this.linear.getShippedFeatures(30),
            this.linear.getUpcomingMilestones(),
          ]);

          tasks.push(...completed, ...shipped);

          // Deduplicate by task ID
          const uniqueTasks = Array.from(
            new Map(tasks.map(t => [t.id, t])).values()
          );

          tasks.length = 0;
          tasks.push(...uniqueTasks);

          // Build Demos context
          demosContext.recentShips = shipped.slice(0, 5);
          demosContext.upcomingFeatures = upcoming
            .slice(0, 3)
            .map(m => m.name);
        } catch (error: any) {
          console.error('  ⚠️  Linear integration failed:', error.message);
        }
      })());
    }

    // Wait for all sources to complete in parallel
    await Promise.all(gatherPromises);

    // If we have few tweets from live monitoring, supplement with unprocessed database tweets
    if (this.db && tweets.length < 10) {
      console.log(`  📚 Supplementing with unprocessed database tweets...`);
      const dbTweets = this.db.getUnprocessedTweets(50); // Get up to 50 unprocessed tweets
      
      // Convert database tweets to Tweet format
      const formattedTweets = dbTweets.map(dbTweet => ({
        id: dbTweet.id,
        text: dbTweet.text,
        author_id: dbTweet.author_id,
        author_username: dbTweet.author_username || 'unknown',
        created_at: dbTweet.created_at,
        like_count: dbTweet.like_count,
        retweet_count: dbTweet.retweet_count,
        reply_count: dbTweet.reply_count,
        quote_count: dbTweet.quote_count,
        impression_count: dbTweet.impression_count,
        source: dbTweet.source as any
      }));

      tweets.push(...formattedTweets);
      console.log(`  • Added ${formattedTweets.length} unprocessed database tweets`);
    }

    return { tweets, tasks, trendingTopics, demosContext };
  }

  /**
   * Score all content (trending topics + Linear tasks)
   *
   * NEW: We score trending topics, not individual tweets.
   * This enables generating original content about trends,
   * rather than replying to specific tweets.
   */
  private scoreAllContent(sources: any) {
    const scored = [];

    // Score individual influencer tweets (specific narratives to tap into)
    // These are prioritized over generic trends for more authentic engagement
    // No minimum score filter - let all influencer tweets through for now
    for (const tweet of sources.tweets || []) {
      const tweetScore = this.scoreInfluencerTweet(tweet);
      scored.push(tweetScore);
    }

    // Score trending topics (broader themes, lower priority than specific tweets)
    for (const trend of sources.trendingTopics || []) {
      scored.push(this.scoreTrendingTopic(trend));
    }

    // Score tasks for ship announcements
    for (const task of sources.tasks) {
      if (this.linear.isShippableTask(task)) {
        scored.push(this.scorer.scoreLinearTask(task));
      }
    }

    return scored;
  }

  /**
   * Score an individual influencer tweet for content generation
   * This enables tapping into specific narratives influencers are pushing
   */
  private scoreInfluencerTweet(tweet: any): ScoredContent {
    let score = 0.5; // Same base as trends - influencer tweets are prioritized
    const reasoning: string[] = [];

    const text = tweet.text?.toLowerCase() || '';
    const metrics = tweet.public_metrics || {};

    // High engagement signals valuable narrative
    const totalEngagement = (metrics.like_count || 0) + (metrics.retweet_count || 0) * 2 + (metrics.reply_count || 0);
    if (totalEngagement > 500) {
      score += 0.15;
      reasoning.push(`High engagement (${totalEngagement})`);
    }
    if (totalEngagement > 2000) {
      score += 0.1;
      reasoning.push('Very high engagement - hot narrative');
    }

    // Check for Demos-relevant topics in the tweet
    // Core pillars: Cross-chain identity, Web2-Web3 interop (DAHR/TLS), Chain abstraction
    const demosKeywords = [
      // Cross-chain & identity
      'identity', 'wallet', 'cross-chain', 'multi-chain', 'bridge', 'interop',
      'chain abstraction', 'unified', 'fragmentation', 'ux', 'user experience',
      'onboarding', 'web3 ux', 'crypto ux', 'seed phrase', 'private key',
      // Web2-Web3 interoperability (DAHR, TLS Notary, attestations)
      'web2', 'web3', 'off-chain', 'offchain', 'on-chain', 'onchain',
      'api', 'http', 'attestation', 'tls', 'proof', 'oracle', 'data feed',
      'real world', 'rwa', 'verifiable', 'trustless', 'zkp', 'zero knowledge',
      // AI agents & automation
      'agent', 'ai agent', 'autonomous', 'automation', 'bot', 'llm',
      // General Web3
      'defi', 'dapp', 'sdk', 'infrastructure', 'protocol'
    ];

    const matchedKeywords = demosKeywords.filter(kw => text.includes(kw));
    if (matchedKeywords.length > 0) {
      score += 0.2 + (matchedKeywords.length * 0.05);
      reasoning.push(`Demos-relevant: ${matchedKeywords.slice(0, 3).join(', ')}`);
    }

    // Pain point indicators (great for positioning Demos as solution)
    const painPointIndicators = [
      'frustrat', 'annoying', 'hate', 'tired of', 'why do', 'why cant',
      'broken', 'terrible', 'nightmare', 'impossible', 'confusing',
      'lost', 'stuck', 'failed', 'cant figure', 'gave up'
    ];

    const hasPainPoint = painPointIndicators.some(p => text.includes(p));
    if (hasPainPoint) {
      score += 0.15;
      reasoning.push('Expresses pain point - opportunity for solution positioning');
    }

    // Future/vision indicators (good for thought leadership)
    const visionIndicators = [
      'future of', 'imagine if', 'what if', 'need to', 'should be',
      'will be', 'next wave', 'evolution', 'revolution'
    ];

    const hasVision = visionIndicators.some(v => text.includes(v));
    if (hasVision) {
      score += 0.1;
      reasoning.push('Vision/future-focused - thought leadership opportunity');
    }

    // Cap score at 0.95
    score = Math.min(score, 0.95);

    const finalScore = Math.min(score, 1.0);
    const category: 'high' | 'medium' | 'low' =
      finalScore >= 0.7 ? 'high' : finalScore >= 0.4 ? 'medium' : 'low';

    return {
      content: tweet,
      score: finalScore,
      reasoning: reasoning.length > 0 ? reasoning : ['Influencer tweet'],
      category,
    };
  }

  /**
   * Score a trending topic for content generation potential
   * Returns a ScoredContent-compatible object
   */
  private scoreTrendingTopic(trend: TrendingTopic): ScoredContent {
    let score = 0.5; // Base score
    const reasoning: string[] = [];

    // Boost for high engagement
    if (trend.engagementScore > 1000) {
      score += 0.15;
      reasoning.push(`High engagement (${trend.engagementScore})`);
    }
    if (trend.engagementScore > 5000) {
      score += 0.1;
      reasoning.push('Very high engagement');
    }

    // Boost for Demos-relevant topics
    if (trend.relevanceToWeb3.includes('Directly relevant')) {
      score += 0.25;
      reasoning.push('Directly relevant to Demos value props');
    } else if (trend.relevanceToWeb3.includes('Related ecosystem')) {
      score += 0.15;
      reasoning.push('Related to Demos ecosystem');
    }

    // Boost for multiple tweets discussing the topic
    if (trend.tweetCount >= 5) {
      score += 0.1;
      reasoning.push(`Active discussion (${trend.tweetCount} tweets)`);
    }
    if (trend.tweetCount >= 10) {
      score += 0.05;
      reasoning.push('Highly active discussion');
    }

    // Boost for topics with hashtags (more discoverable)
    if (trend.hashtags.length > 0) {
      score += 0.05;
      reasoning.push(`Has hashtags: ${trend.hashtags.slice(0, 3).join(', ')}`);
    }

    const finalScore = Math.min(score, 1.0);
    const category: 'high' | 'medium' | 'low' =
      finalScore >= 0.7 ? 'high' : finalScore >= 0.4 ? 'medium' : 'low';

    return {
      content: trend,
      score: finalScore,
      reasoning,
      category,
    };
  }

  /**
   * Generate AI drafts for high-scoring content
   */
  private async generateDrafts(scoredContent: any[], demosContext: any) {
    const drafts = [];
    const limit = Math.min(scoredContent.length, this.config.maxDraftsPerRun);

    for (let i = 0; i < limit; i++) {
      const item = scoredContent[i];

      // Determine source type for this item
      const sourceType = 'topic' in item.content ? 'trend' :
                        'title' in item.content ? 'linear_task' : 'tweet';

      try {

        // Check if content has already been generated for this source
        // This prevents duplicate content when the same Linear task or trend is processed multiple times
        if (this.db) {

          // For trends: include date AND a hash of sample tweets to allow same topic with fresh tweets
          // This allows "wallets" to generate new content if the underlying tweets are different
          let sourceId: string;
          if ('topic' in item.content) {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const tweetHash = item.content.sampleTweets?.slice(0, 2).join('').substring(0, 50) || '';
            sourceId = `trend:${item.content.topic.substring(0, 30)}:${today}:${tweetHash.substring(0, 20)}`;
          } else {
            sourceId = item.content.id;
          }

          if (sourceId && this.db.hasContentForSource(sourceType, sourceId)) {
            console.log(`  ⏭️  Skipping ${sourceType} "${sourceId?.substring(0, 30)}..." - already generated content for this source`);
            continue;
          }
        }

        // Build generation context
        const context: GenerationContext = {
          trigger: this.buildTrigger(item.content),
          demosContext,
        };

        // Generate content using enhanced AI or standard generator
        let generated;
        let isEnhancedContent = false;
        
        if (this.config.useEnhancedAI) {
          console.log(`  🧠 Using enhanced multi-step reasoning for content generation...`);
          try {
            generated = await this.enhancedAIGenerator.generate(context);
            isEnhancedContent = true;
          } catch (error: any) {
            console.log(`  ❌ Enhanced generation failed: ${error.message}`);
            console.log(`  🔄 Falling back to simple template generation...`);
            generated = await this.fallbackGenerator.generate(context);
          }
        } else {
          try {
            generated = await this.aiGenerator.generate(context);
          } catch (error: any) {
            console.log(`  ❌ AI generation failed: ${error.message}`);
            console.log(`  🔄 Falling back to simple template generation...`);
            generated = await this.fallbackGenerator.generate(context);
          }
        }

        // Mark tweet as processed regardless of success (avoid reprocessing)
        if (sourceType === 'tweet' && item.content.id) {
          this.db?.markTweetProcessed(item.content.id);
        }

        if (generated) {
          let finalContent = generated.content;
          let brandScore = 1.0;

          // Brand review if enabled
          if (this.config.enableBrandReview) {
            const contentText = Array.isArray(finalContent)
              ? finalContent.join('\n\n')
              : finalContent;

            const review = await this.brandingAgent.reviewContent(
              contentText,
              this.getSourceDescription(item.content)
            );

            brandScore = review.score;

            // If not approved, try to improve
            if (!review.approved && review.redFlags.length > 0) {
              console.log(`  ⚠️  Brand issues detected (score: ${Math.round(review.score * 100)}%)`);
              const improved = await this.brandingAgent.improveContent(
                contentText,
                review.redFlags,
                this.getSourceDescription(item.content)
              );

              if (Array.isArray(finalContent)) {
                // Split improved content back into thread format
                finalContent = improved.split('\n\n').filter(t => t.trim());
              } else {
                finalContent = improved;
              }

              console.log(`  ✓ Content improved for brand alignment`);
            }
          }

          // Generate visual if enabled (uses Imagen if configured, else DALL-E)
          let imageUrl: string | undefined;
          if (this.config.enableVisualGeneration) {
            const contentType = this.determineContentType(generated.type);
            const mainMessage = Array.isArray(finalContent)
              ? finalContent[0]
              : finalContent;

            imageUrl = await this.generateImage(contentType, mainMessage);
          }

          // Prepare draft data
          const draft = {
            content: finalContent,
            type: generated.type,
            source: this.getSourceDescription(item.content),
            relevanceScore: item.score,
            brandScore,
            reasoning: item.reasoning,
            imageUrl,
            generatedAt: new Date().toISOString(),
          };

          // Store in database for history and deduplication
          const contentText = Array.isArray(finalContent)
            ? finalContent.join('\n\n')
            : finalContent;

          // Determine content type
          const contentType = Array.isArray(finalContent) ? 'thread' : 'tweet';

          // Get source ID - TrendingTopic uses topic name as identifier
          const sourceId = 'topic' in item.content
            ? `trend:${item.content.topic.substring(0, 50)}`
            : item.content.id;

          // Build full context for editing reference
          let sourceContext = this.buildSourceContext(item.content, item.reasoning);

          // Add enhanced metadata if available
          if (isEnhancedContent && generated) {
            const enhancedContent = generated as EnhancedGeneratedContent;
            const enhancedData = {
              reasoning_steps: enhancedContent.reasoning_steps,
              context_analysis: enhancedContent.context_analysis,
              strategy: enhancedContent.strategy,
              quality_assessment: enhancedContent.quality_assessment
            };
            
            // Enhance the source context with AI reasoning data
            const contextData = sourceContext ? JSON.parse(sourceContext) : {};
            contextData.enhanced_ai = enhancedData;
            sourceContext = JSON.stringify(contextData);
          }

          this.storeGeneratedContent(
            contentText,
            contentType,
            sourceType as 'tweet' | 'linear_task' | 'trend' | 'milestone',
            sourceId,
            this.getSourceDescription(item.content),
            sourceContext,
            item.score,
            brandScore,
            imageUrl
          );

          drafts.push(draft);
          console.log(`  ✓ Generated: ${this.getSourceDescription(item.content)}`);
        }

        // Rate limiting (reduced from 1500ms for faster processing)
        await this.sleep(500);
      } catch (error: any) {
        console.error(`  ✗ Generation failed for item ${i}:`, error.message);
        
        // Still mark tweet as processed even if generation fails to avoid infinite retries
        if (sourceType === 'tweet' && item.content.id) {
          this.db?.markTweetProcessed(item.content.id);
        }
      }
    }

    return drafts;
  }

  /**
   * Build trigger object for AI generator
   *
   * Handles three content types:
   * 1. Individual influencer tweets - tap into specific narratives
   * 2. Trending topics - broader themes
   * 3. Linear tasks - ship announcements
   */
  private buildTrigger(content: any): GenerationContext['trigger'] {
    // Check if it's an individual tweet (has 'text' and 'public_metrics')
    if ('text' in content && 'public_metrics' in content) {
      // It's an influencer tweet - generate content that taps into this narrative
      return {
        type: 'influencer_tweet',
        content: content.text,
        metadata: {
          authorId: content.author_id,
          authorUsername: content.author_username,
          tweetId: content.id,
          engagement: {
            likes: content.public_metrics?.like_count || 0,
            retweets: content.public_metrics?.retweet_count || 0,
            replies: content.public_metrics?.reply_count || 0,
          },
          hashtags: content.entities?.hashtags?.map((h: any) => h.tag) || [],
          createdAt: content.created_at,
        },
      };
    }

    // Check if it's a TrendingTopic (has 'topic' and 'relevanceToWeb3' fields)
    if ('topic' in content && 'relevanceToWeb3' in content) {
      // It's a trending topic - generate ORIGINAL content about this trend
      return {
        type: 'trend',
        content: content.topic,
        metadata: {
          context: content.context,
          relevance: content.relevanceToWeb3,
          sampleTweets: content.sampleTweets,
          hashtags: content.hashtags,
          engagementScore: content.engagementScore,
          tweetCount: content.tweetCount,
        },
      };
    } else if ('title' in content) {
      // It's a Linear task - generate ship announcement
      return {
        type: 'linear_task',
        content: content.title,
        url: content.url,
        metadata: {
          description: content.description,
          labels: content.labels,
        },
      };
    } else {
      // Fallback for any other content type
      return {
        type: 'trend',
        content: String(content),
        metadata: {},
      };
    }
  }

  /**
   * Send drafts to Typefully
   */
  private async sendToTypefully(drafts: any[]): Promise<number> {
    let sent = 0;

    for (const draft of drafts) {
      try {
        const draftData: any = {
          content: draft.content,
          share: true,
        };

        // Add media if image was generated
        if (draft.imageUrl) {
          draftData.media = [
            {
              file_path: draft.imageUrl,
            },
          ];
        }

        await this.typefully.createDraft(draftData);

        sent++;

        console.log(`  ✓ Sent to Typefully: ${draft.source}`);
        if (draft.imageUrl) {
          console.log(`    📎 With image: ${draft.imageUrl}`);
        }

        // Rate limiting
        await this.sleep(500);
      } catch (error: any) {
        console.error(`  ✗ Failed to send draft:`, error.message);
      }
    }

    return sent;
  }

  /**
   * Get human-readable source description
   */
  private getSourceDescription(content: any): string {
    if ('topic' in content && 'relevanceToWeb3' in content) {
      // It's a TrendingTopic
      return `Trend: "${content.topic}"`;
    } else if ('title' in content) {
      // It's a Linear task
      return `Task: "${content.title}"`;
    } else if ('text' in content) {
      // It's a tweet (legacy, shouldn't happen in new flow)
      return `Tweet: "${content.text.substring(0, 50)}..."`;
    } else {
      return `Content: ${String(content).substring(0, 50)}...`;
    }
  }

  /**
   * Build full source context JSON for editing reference
   * Includes sample tweets, reasoning, and any relevant metadata
   */
  private buildSourceContext(content: any, reasoning?: string): string | undefined {
    try {
      const context: {
        type: string;
        topic?: string;
        sampleTweets?: string[];
        relevanceToWeb3?: string;
        reasoning?: string;
        taskTitle?: string;
        taskDescription?: string;
        taskLabels?: string[];
        // Influencer tweet fields
        influencerUsername?: string;
        influencerTweetId?: string;
        influencerTweetUrl?: string;
        engagement?: {
          likes: number;
          retweets: number;
          replies: number;
        };
      } = {
        type: 'unknown',
      };

      // Check if it's an influencer tweet (has 'text' and 'public_metrics')
      if ('text' in content && 'public_metrics' in content) {
        context.type = 'influencer_tweet';
        context.sampleTweets = [content.text];
        context.influencerUsername = content.author_username;
        context.influencerTweetId = content.id;
        // Build Twitter URL if we have the tweet ID
        if (content.id && content.author_username) {
          context.influencerTweetUrl = `https://twitter.com/${content.author_username}/status/${content.id}`;
        }
        context.engagement = {
          likes: content.public_metrics?.like_count || 0,
          retweets: content.public_metrics?.retweet_count || 0,
          replies: content.public_metrics?.reply_count || 0,
        };
      } else if ('topic' in content && 'relevanceToWeb3' in content) {
        // It's a TrendingTopic
        context.type = 'trend';
        context.topic = content.topic;
        context.relevanceToWeb3 = content.relevanceToWeb3;
        // Include sample tweets (limit to 5 for storage efficiency)
        if (content.sampleTweets && Array.isArray(content.sampleTweets)) {
          context.sampleTweets = content.sampleTweets.slice(0, 5).map((t: any) =>
            typeof t === 'string' ? t : t.text || String(t)
          );
        }
      } else if ('title' in content) {
        // It's a Linear task
        context.type = 'linear_task';
        context.taskTitle = content.title;
        context.taskDescription = content.description;
        if (content.labels && typeof content.labels === 'string') {
          context.taskLabels = content.labels.split(',').map((l: string) => l.trim());
        }
      } else if ('text' in content) {
        // It's a generic tweet (fallback)
        context.type = 'tweet';
        context.sampleTweets = [content.text];
      }

      // Add AI reasoning if available
      if (reasoning) {
        context.reasoning = reasoning;
      }

      return JSON.stringify(context);
    } catch (error) {
      console.warn('Failed to build source context:', error);
      return undefined;
    }
  }

  /**
   * Determine visual content type from generation type
   */
  private determineContentType(
    type: string
  ): 'ship' | 'trend' | 'educational' | 'weekly' | 'quote' {
    if (type.includes('ship') || type.includes('announcement')) {
      return 'ship';
    } else if (type.includes('thread') || type.includes('educational')) {
      return 'educational';
    } else if (type.includes('weekly') || type.includes('digest')) {
      return 'weekly';
    } else if (type.includes('quote')) {
      return 'quote';
    } else {
      return 'trend';
    }
  }

  /**
   * Print pipeline summary
   */
  private printSummary(result: PipelineResult) {
    console.log('═══════════════════════════════════════════');
    console.log('📊 PIPELINE SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Items processed:    ${result.itemsProcessed}`);
    console.log(`Drafts created:     ${result.draftsCreated}`);
    console.log(`Skipped:            ${result.skipped}`);
    console.log(`Errors:             ${result.errors.length}`);
    console.log('═══════════════════════════════════════════\n');

    if (result.topDrafts.length > 0) {
      console.log('🌟 TOP GENERATED DRAFTS:\n');
      result.topDrafts.slice(0, 3).forEach((draft, i) => {
        console.log(`${i + 1}. ${draft.source}`);
        console.log(`   Score: ${Math.round(draft.relevanceScore * 100)}%`);
        if (Array.isArray(draft.content)) {
          console.log(`   Thread (${draft.content.length} tweets):`);
          console.log(`   "${draft.content[0].substring(0, 60)}..."`);
        } else {
          console.log(`   "${draft.content.substring(0, 80)}..."`);
        }
        console.log('');
      });
    }
  }

  /**
   * Initialize brand voice learning from @DemosNetwork tweets
   */
  private async initializeBrandVoice(): Promise<void> {
    console.log('🧠 Initializing brand voice learning...');

    try {
      // Check if we have a recent profile
      const isFresh = await this.profileStorage.isProfileFresh(
        this.config.brandProfileUpdateHours
      );

      if (isFresh) {
        // Load existing profile
        const profile = await this.profileStorage.load();
        if (profile) {
          this.brandingAgent.updateProfile(profile);
          const ageHours = await this.profileStorage.getProfileAge();
          console.log(`  ✓ Using cached brand profile (${Math.round(ageHours!)} hours old)`);
          return;
        }
      }

      // Learn from sources
      let profile;
      if (this.config.brandLearnFromParagraph) {
        console.log('  📥 Analyzing @DemosNetwork content from all sources...');
        profile = await this.brandLearner.learnFromAllSources(100, 10);
      } else {
        console.log('  📥 Analyzing @DemosNetwork tweets...');
        profile = await this.brandLearner.learnFromTwitter(100);
      }

      // Save profile
      await this.profileStorage.save(profile);
      await this.profileStorage.exportAsText(profile);

      // Update branding agent
      this.brandingAgent.updateProfile(profile);

      console.log(`  ✓ Learned brand voice from ${profile.samplesAnalyzed} tweets`);
      console.log(`  📊 Technical: ${Math.round(profile.voiceCharacteristics.technicalLevel * 100)}% | Casual: ${Math.round(profile.voiceCharacteristics.casualness * 100)}%`);
    } catch (error: any) {
      console.error('  ⚠️  Brand learning failed, using default guidelines:', error.message);
      // Continue with hardcoded guidelines (fallback)
    }

    console.log('');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== DATABASE HELPERS ====================

  /**
   * Store tweets in the database for history
   */
  private storeTweetsInDatabase(tweets: Tweet[]): void {
    if (!this.db) return;

    for (const tweet of tweets) {
      try {
        // Skip if already exists
        if (this.db.tweetExists(tweet.id)) continue;

        // Ensure all values are SQLite-compatible (no undefined)
        const record = {
          id: String(tweet.id || ''),
          text: String(tweet.text || ''),
          author_id: String(tweet.author_id || ''),
          author_username: null, // Could be enriched later
          created_at: String(tweet.created_at || new Date().toISOString()),
          like_count: Number(tweet.public_metrics?.like_count) || 0,
          retweet_count: Number(tweet.public_metrics?.retweet_count) || 0,
          reply_count: Number(tweet.public_metrics?.reply_count) || 0,
          quote_count: Number(tweet.public_metrics?.quote_count) || 0,
          impression_count: tweet.public_metrics?.impression_count != null
            ? Number(tweet.public_metrics.impression_count)
            : null,
          source: 'influencer' as const,
          relevance_score: null,
          processed: false,
        };

        this.db.insertTweet(record);
      } catch (error: any) {
        console.error(`  ⚠️  Failed to store tweet ${tweet.id}:`, error.message);
      }
    }
  }

  /**
   * Store Linear tasks in the database for history
   */
  private storeTasksInDatabase(tasks: LinearTask[]): void {
    if (!this.db) return;

    for (const task of tasks) {
      try {
        // Ensure all values are SQLite-compatible (no undefined)
        const record = {
          id: String(task.id || ''),
          title: String(task.title || ''),
          description: task.description != null ? String(task.description) : null,
          state: String(task.state || ''),
          labels: Array.isArray(task.labels) ? task.labels.join(',') : '',
          url: task.url != null ? String(task.url) : null,
          completed_at: task.completedAt != null ? String(task.completedAt) : null,
          processed: false,
        };

        this.db.insertLinearTask(record);
      } catch (error: any) {
        console.error(`  ⚠️  Failed to store task ${task.id}:`, error.message);
      }
    }
  }

  /**
   * Store generated content in the database
   */
  private storeGeneratedContent(
    content: string,
    contentType: 'tweet' | 'thread',
    sourceType: 'tweet' | 'linear_task' | 'trend' | 'milestone',
    sourceId: string | undefined,
    sourceText: string | undefined,
    sourceContext: string | undefined,
    relevanceScore: number,
    brandScore: number,
    imagePath?: string
  ): number | null {
    if (!this.db) return null;

    // Check for duplicate content
    if (this.db.isDuplicateContent(content)) {
      console.log('  ⚠️  Skipping duplicate content');
      return null;
    }

    const id = this.db.insertGeneratedContent({
      content,
      content_type: contentType,
      source_type: sourceType,
      source_id: sourceId,
      source_text: sourceText,
      source_context: sourceContext,
      relevance_score: relevanceScore,
      brand_score: brandScore,
      status: 'draft',
      image_path: imagePath,
    });

    // Register content hash for future deduplication
    this.db.registerContentHash(content, id);

    return id;
  }

  /**
   * Generate image using Imagen or DALL-E fallback
   */
  private async generateImage(
    contentType: 'ship' | 'trend' | 'educational' | 'weekly' | 'quote',
    mainMessage: string
  ): Promise<string | undefined> {
    try {
      // Try Imagen first if configured
      if (this.imagenGenerator) {
        const image = await this.imagenGenerator.generate({
          contentType,
          mainMessage: mainMessage.substring(0, 200),
          style: 'minimal',
        });
        console.log(`  🎨 Generated visual (Imagen): ${image.localPath}`);
        return image.localPath;
      }

      // Fall back to DALL-E
      const image = await this.imageGenerator.generate({
        contentType,
        mainMessage: mainMessage.substring(0, 200),
        style: 'minimal',
      });
      console.log(`  🎨 Generated visual (DALL-E): ${image.localPath}`);
      return image.localPath;
    } catch (error: any) {
      console.error(`  ⚠️  Visual generation failed:`, error.message);
      return undefined;
    }
  }

  /**
   * Get database statistics
   */
  getStats(): {
    tweets: number;
    articles: number;
    tasks: number;
    generated: number;
    byStatus: Record<string, number>;
  } | null {
    if (!this.db) return null;
    return this.db.getStats();
  }

  /**
   * Get recent pipeline runs
   */
  getRecentRuns(limit = 10): any[] {
    if (!this.db) return [];
    return this.db.getRecentRuns(limit);
  }
}

export default ContentPipeline;

// Main execution when run directly
if (require.main === module) {
  const dotenv = require('dotenv');
  dotenv.config();

  async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯  DEMOS MARKETING INTELLIGENCE - PIPELINE RUN');
    console.log('═══════════════════════════════════════════════════════\n');

    const pipeline = new ContentPipeline(
      process.env.TYPEFULLY_API_KEY || '',
      process.env.TWITTER_BEARER_TOKEN || '',
      process.env.LINEAR_API_KEY || '',
      process.env.LINEAR_TEAM_ID || '',
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
      process.env.OPENAI_API_KEY || '',
      process.env.RAPIDAPI_KEY || '',
      {
        maxDraftsPerRun: parseInt(process.env.MAX_DRAFTS_PER_RUN || process.env.MAX_DRAFTS_PER_DAY || '15'),
        minRelevanceScore: parseFloat(process.env.MIN_RELEVANCE_SCORE || '0.4'),
        enableTwitterMonitoring: process.env.MONITOR_CRYPTO_INFLUENCERS !== 'false',
        enableLinearIntegration: !!process.env.LINEAR_API_KEY,
        enableVisualGeneration: process.env.ENABLE_VISUAL_GENERATION === 'true',
        enableBrandReview: process.env.ENABLE_BRAND_REVIEW !== 'false',
        enableBrandLearning: process.env.ENABLE_BRAND_LEARNING !== 'false',
        brandLearnFromParagraph: process.env.BRAND_LEARN_FROM_PARAGRAPH !== 'false',
        brandProfileUpdateHours: parseInt(process.env.BRAND_PROFILE_UPDATE_HOURS || '168'),
        dryRun: process.env.DRY_RUN === 'true',
        useEnhancedAI: process.env.USE_ENHANCED_AI === 'true',
      }
    );

    try {
      const result = await pipeline.run();
      if (result.errors.length > 0) {
        console.error('\n⚠️  Pipeline completed with errors:', result.errors);
        process.exit(1);
      }
      process.exit(0);
    } catch (error: any) {
      console.error('❌ Pipeline failed:', error.message);
      process.exit(1);
    }
  }

  main();
}
