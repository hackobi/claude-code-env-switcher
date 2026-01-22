import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import TwitterRapidAPI from '../integrations/twitter-rapidapi';
import ParagraphScraper from '../integrations/paragraph';

export interface BrandVoiceProfile {
  lastUpdated: string;
  samplesAnalyzed: number;
  sources: {
    twitter: number;
    paragraph: number;
  };
  voiceCharacteristics: {
    tone: string[];
    commonPhrases: string[];
    avoidedPhrases: string[];
    technicalLevel: number; // 0-1
    casualness: number; // 0-1
    enthusiasm: number; // 0-1
  };
  topicPatterns: {
    shippingAnnouncements: string[];
    technicalExplanations: string[];
    communityEngagement: string[];
  };
  structuralPatterns: {
    averageTweetLength: number;
    threadUsage: number; // % of tweets that are threads
    emojiUsage: number; // average per tweet
    hashtagUsage: number; // average per tweet
  };
  exampleTweets: {
    excellent: string[];
    good: string[];
  };
}

/**
 * Learns Demos' brand voice by analyzing their actual Twitter content
 * Uses RapidAPI's Twitter API45 for cost-effective tweet fetching
 * Uses Claude CLI for analysis (mirrors App Creation Pipeline pattern)
 */
export class BrandVoiceLearner {
  private twitter: TwitterRapidAPI;
  private paragraph: ParagraphScraper;
  private model = 'claude-sonnet-4-5-20250929';
  private claudePath: string | null = null;
  private demosTwitterHandle = 'DemosNetwork'; // Main Demos account

  constructor(_anthropicApiKey: string, rapidApiKey: string) {
    // API key not used - we use Claude CLI which handles auth
    this.twitter = new TwitterRapidAPI(rapidApiKey);
    this.paragraph = new ParagraphScraper();
    this.claudePath = this.findClaudeCLI();
    if (!this.claudePath) {
      console.warn('Claude CLI not found. Brand learning will be limited.');
    }
  }

  /**
   * Find the claude CLI executable
   * Prioritizes direct binary paths over 'which' to avoid shell aliases
   */
  private findClaudeCLI(): string | null {
    const home = process.env['HOME'] || '';

    // Check common installation locations first (avoids shell alias issues)
    const commonPaths = [
      `${home}/.npm-global/bin/claude`,
      `${home}/.local/bin/claude`,
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Fallback to which (may return aliased path)
    try {
      const stdout = execSync('which claude', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      if (stdout.trim()) {
        return stdout.trim();
      }
    } catch {
      // Not in PATH
    }

    return null;
  }

  /**
   * Execute Claude CLI with a prompt
   */
  private async executeClaudeCLI(prompt: string, timeout = 180000): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.claudePath) {
        reject(new Error('Claude CLI not found. Please install claude-code.'));
        return;
      }

      const args = [
        '--print',
        '--model', 'sonnet',
        '--disallowed-tools', 'Bash,Edit,Write,Read,Glob,Grep,Task,WebFetch,WebSearch',
        '--mcp-config', '{"mcpServers":{}}',
        '-p', prompt,
      ];

      const childProcess = spawn(this.claudePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored - we pass prompt via args
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        if (!killed) {
          killed = true;
          childProcess.kill('SIGTERM');
          reject(new Error(`Claude CLI timed out after ${timeout}ms`));
        }
      }, timeout);

      childProcess.on('close', (exitCode) => {
        clearTimeout(timer);
        if (killed) return;

        if (exitCode === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Claude CLI exited with code ${exitCode}: ${stderr}`));
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Analyze Demos' content from Twitter and Paragraph blog
   */
  async learnFromAllSources(tweetCount = 100, blogPostCount = 10): Promise<BrandVoiceProfile> {
    console.log(`🔍 Learning brand voice from multiple sources...`);

    // Fetch tweets
    console.log(`  📱 Fetching ${tweetCount} tweets from @${this.demosTwitterHandle}...`);
    const tweets = await this.fetchDemosTweets(tweetCount);
    console.log(`    ✓ Fetched ${tweets.length} tweets`);

    // Fetch blog posts
    console.log(`  📝 Fetching ${blogPostCount} blog posts from Paragraph...`);
    const blogPosts = await this.fetchParagraphPosts(blogPostCount);
    console.log(`    ✓ Fetched ${blogPosts.length} blog posts`);

    if (tweets.length === 0 && blogPosts.length === 0) {
      console.warn('  ⚠️  No content found, using default profile');
      return this.getDefaultProfile();
    }

    // Analyze with Claude
    try {
      const profile = await this.analyzeContentWithClaude(tweets, blogPosts);
      console.log(`  ✓ Generated brand voice profile from ${tweets.length + blogPosts.length} samples`);
      return profile;
    } catch (error: any) {
      console.error('  ⚠️  Brand learning failed, using default guidelines:', error.message);
      return this.getDefaultProfile();
    }
  }

  /**
   * Analyze Demos' recent tweets to build voice profile (Twitter only)
   */
  async learnFromTwitter(count = 100): Promise<BrandVoiceProfile> {
    console.log(`🔍 Learning brand voice from @${this.demosTwitterHandle}'s last ${count} tweets...`);

    const tweets = await this.fetchDemosTweets(count);

    if (tweets.length === 0) {
      console.warn('  ⚠️  No tweets found, using default profile');
      return this.getDefaultProfile();
    }

    console.log(`  ✓ Fetched ${tweets.length} tweets`);

    try {
      // Analyze with Claude (blog posts = empty array)
      const profile = await this.analyzeContentWithClaude(tweets, []);
      console.log(`  ✓ Generated brand voice profile`);
      return profile;
    } catch (error: any) {
      console.error('  ⚠️  Brand learning failed:', error.message);
      return this.getDefaultProfile();
    }
  }

  /**
   * Fetch tweets from Demos Network account using RapidAPI
   */
  private async fetchDemosTweets(count: number): Promise<string[]> {
    try {
      // Use RapidAPI's user timeline endpoint
      const results = await this.twitter.getUserTimeline(this.demosTwitterHandle, count);

      // Filter out retweets (they start with "RT @")
      const originalTweets = results.filter(tweet => !tweet.text.startsWith('RT @'));

      return originalTweets.map(tweet => tweet.text);
    } catch (error: any) {
      console.error('Failed to fetch Demos tweets:', error.message);

      // Fallback: return empty array and let caller handle
      return [];
    }
  }

  /**
   * Fetch blog posts from Paragraph
   */
  private async fetchParagraphPosts(count: number): Promise<string[]> {
    try {
      const posts = await this.paragraph.fetchRecentPosts(count);
      const paragraphs = this.paragraph.extractKeyParagraphs(posts, 2);
      return paragraphs;
    } catch (error: any) {
      console.error('Failed to fetch Paragraph posts:', error.message);
      return [];
    }
  }

  /**
   * Analyze tweets and blog content with Claude to extract brand voice patterns
   */
  private async analyzeContentWithClaude(tweets: string[], blogContent: string[]): Promise<BrandVoiceProfile> {
    const hasBlogContent = blogContent.length > 0;

    const prompt = `You are analyzing content from Demos Network to understand their brand voice and communication style across different mediums.

${tweets.length > 0 ? `TWITTER CONTENT (${tweets.length} tweets):
${tweets.map((tweet, i) => `${i + 1}. "${tweet}"`).join('\n\n')}` : ''}

${hasBlogContent ? `\nBLOG CONTENT (from Paragraph.com/@demos - ${blogContent.length} paragraphs):
${blogContent.map((para, i) => `${i + 1}. "${para.substring(0, 500)}..."`).join('\n\n')}` : ''}

ANALYSIS TASK:
Extract the brand voice characteristics, patterns, and guidelines from this content.
${hasBlogContent ? 'Note the differences between Twitter (concise, immediate) and blog (deeper, explanatory) content.' : ''}

Return ONLY valid JSON (no markdown, no explanation):
{
  "voiceCharacteristics": {
    "tone": ["array of tone descriptors like: technical, humble, educational, etc."],
    "commonPhrases": ["phrases they use often"],
    "avoidedPhrases": ["marketing clichés they clearly avoid"],
    "technicalLevel": 0.0-1.0,
    "casualness": 0.0-1.0,
    "enthusiasm": 0.0-1.0
  },
  "topicPatterns": {
    "shippingAnnouncements": ["patterns for announcing new features"],
    "technicalExplanations": ["patterns for explaining tech"],
    "communityEngagement": ["patterns for engaging with community"]
  },
  "structuralPatterns": {
    "averageTweetLength": number,
    "threadUsage": 0.0-1.0,
    "emojiUsage": average_per_tweet,
    "hashtagUsage": average_per_tweet
  },
  "exampleTweets": {
    "excellent": ["5 best examples that perfectly capture their voice"],
    "good": ["5 good examples showing variety"]
  }
}

Focus on:
1. What makes their voice distinctive and authentic
2. How they balance technical depth with accessibility
3. What language patterns they consistently use/avoid
4. How they structure announcements vs. explanations vs. engagement`;

    const response = await this.executeClaudeCLI(prompt);

    // Extract JSON from response (handle potential markdown formatting)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      lastUpdated: new Date().toISOString(),
      samplesAnalyzed: tweets.length + blogContent.length,
      sources: {
        twitter: tweets.length,
        paragraph: blogContent.length,
      },
      ...analysis,
    };
  }

  /**
   * Generate brand guidelines text from learned profile
   */
  generateGuidelinesFromProfile(profile: BrandVoiceProfile): string {
    const sources = profile.sources
      ? `${profile.sources.twitter} tweets + ${profile.sources.paragraph} blog paragraphs`
      : `${profile.samplesAnalyzed} samples`;

    return `DEMOS NETWORK BRAND VOICE (Learned from Multiple Sources)
Last Updated: ${new Date(profile.lastUpdated).toLocaleDateString()}
Based on ${sources}

VOICE CHARACTERISTICS:
Tone: ${profile.voiceCharacteristics.tone.join(', ')}
Technical Level: ${Math.round(profile.voiceCharacteristics.technicalLevel * 100)}%
Casualness: ${Math.round(profile.voiceCharacteristics.casualness * 100)}%
Enthusiasm: ${Math.round(profile.voiceCharacteristics.enthusiasm * 100)}%

COMMON PHRASES (Use These):
${profile.voiceCharacteristics.commonPhrases.map(p => `- "${p}"`).join('\n')}

AVOIDED PHRASES (Don't Use These):
${profile.voiceCharacteristics.avoidedPhrases.map(p => `- "${p}"`).join('\n')}

TOPIC PATTERNS:

Shipping Announcements:
${profile.topicPatterns.shippingAnnouncements.map(p => `- ${p}`).join('\n')}

Technical Explanations:
${profile.topicPatterns.technicalExplanations.map(p => `- ${p}`).join('\n')}

Community Engagement:
${profile.topicPatterns.communityEngagement.map(p => `- ${p}`).join('\n')}

STRUCTURAL PATTERNS:
- Average tweet length: ${profile.structuralPatterns.averageTweetLength} characters
- Thread usage: ${Math.round(profile.structuralPatterns.threadUsage * 100)}%
- Emoji usage: ${profile.structuralPatterns.emojiUsage.toFixed(1)} per tweet
- Hashtag usage: ${profile.structuralPatterns.hashtagUsage.toFixed(1)} per tweet

EXCELLENT EXAMPLES (Learn From These):
${profile.exampleTweets.excellent.map((tweet, i) => `${i + 1}. "${tweet}"`).join('\n\n')}

GOOD EXAMPLES (Showing Variety):
${profile.exampleTweets.good.map((tweet, i) => `${i + 1}. "${tweet}"`).join('\n\n')}`;
  }

  /**
   * Update brand voice profile periodically
   */
  async updateProfile(existingProfile?: BrandVoiceProfile): Promise<BrandVoiceProfile> {
    console.log('🔄 Updating brand voice profile...');

    // Fetch recent tweets (smaller sample for updates)
    const recentTweets = await this.fetchDemosTweets(50);

    if (recentTweets.length === 0) {
      console.log('  ⚠️  No new tweets found, keeping existing profile');
      return existingProfile || this.getDefaultProfile();
    }

    try {
      // Analyze new tweets
      const newProfile = await this.analyzeContentWithClaude(recentTweets, []);

      // If we have existing profile, merge insights
      if (existingProfile) {
        return this.mergeProfiles(existingProfile, newProfile);
      }

      return newProfile;
    } catch (error: any) {
      console.error('  ⚠️  Profile update failed:', error.message);
      return existingProfile || this.getDefaultProfile();
    }
  }

  /**
   * Merge old and new profiles (weighted average)
   */
  private mergeProfiles(
    existing: BrandVoiceProfile,
    updated: BrandVoiceProfile
  ): BrandVoiceProfile {
    // Weight: 70% existing, 30% new (prevents dramatic shifts)
    const oldWeight = 0.7;
    const newWeight = 0.3;

    return {
      lastUpdated: new Date().toISOString(),
      samplesAnalyzed: existing.samplesAnalyzed + updated.samplesAnalyzed,
      sources: {
        twitter: (existing.sources?.twitter || 0) + (updated.sources?.twitter || 0),
        paragraph: (existing.sources?.paragraph || 0) + (updated.sources?.paragraph || 0),
      },
      voiceCharacteristics: {
        tone: [...new Set([...existing.voiceCharacteristics.tone, ...updated.voiceCharacteristics.tone])],
        commonPhrases: [...new Set([...existing.voiceCharacteristics.commonPhrases, ...updated.voiceCharacteristics.commonPhrases])],
        avoidedPhrases: [...new Set([...existing.voiceCharacteristics.avoidedPhrases, ...updated.voiceCharacteristics.avoidedPhrases])],
        technicalLevel: existing.voiceCharacteristics.technicalLevel * oldWeight + updated.voiceCharacteristics.technicalLevel * newWeight,
        casualness: existing.voiceCharacteristics.casualness * oldWeight + updated.voiceCharacteristics.casualness * newWeight,
        enthusiasm: existing.voiceCharacteristics.enthusiasm * oldWeight + updated.voiceCharacteristics.enthusiasm * newWeight,
      },
      topicPatterns: {
        shippingAnnouncements: [...new Set([...existing.topicPatterns.shippingAnnouncements, ...updated.topicPatterns.shippingAnnouncements])],
        technicalExplanations: [...new Set([...existing.topicPatterns.technicalExplanations, ...updated.topicPatterns.technicalExplanations])],
        communityEngagement: [...new Set([...existing.topicPatterns.communityEngagement, ...updated.topicPatterns.communityEngagement])],
      },
      structuralPatterns: {
        averageTweetLength: Math.round(existing.structuralPatterns.averageTweetLength * oldWeight + updated.structuralPatterns.averageTweetLength * newWeight),
        threadUsage: existing.structuralPatterns.threadUsage * oldWeight + updated.structuralPatterns.threadUsage * newWeight,
        emojiUsage: existing.structuralPatterns.emojiUsage * oldWeight + updated.structuralPatterns.emojiUsage * newWeight,
        hashtagUsage: existing.structuralPatterns.hashtagUsage * oldWeight + updated.structuralPatterns.hashtagUsage * newWeight,
      },
      exampleTweets: {
        // Keep best examples from both
        excellent: [...updated.exampleTweets.excellent.slice(0, 3), ...existing.exampleTweets.excellent.slice(0, 2)],
        good: [...updated.exampleTweets.good.slice(0, 3), ...existing.exampleTweets.good.slice(0, 2)],
      },
    };
  }

  /**
   * Get default profile (fallback if Twitter fetch fails)
   */
  private getDefaultProfile(): BrandVoiceProfile {
    return {
      lastUpdated: new Date().toISOString(),
      samplesAnalyzed: 0,
      sources: {
        twitter: 0,
        paragraph: 0,
      },
      voiceCharacteristics: {
        tone: ['technical', 'humble', 'educational', 'authentic'],
        commonPhrases: [],
        avoidedPhrases: ['revolutionary', 'game-changing', 'to the moon'],
        technicalLevel: 0.7,
        casualness: 0.5,
        enthusiasm: 0.6,
      },
      topicPatterns: {
        shippingAnnouncements: [],
        technicalExplanations: [],
        communityEngagement: [],
      },
      structuralPatterns: {
        averageTweetLength: 200,
        threadUsage: 0.3,
        emojiUsage: 0.5,
        hashtagUsage: 0.2,
      },
      exampleTweets: {
        excellent: [],
        good: [],
      },
    };
  }
}

export default BrandVoiceLearner;
