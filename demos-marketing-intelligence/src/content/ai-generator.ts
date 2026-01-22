import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import { Tweet } from '../integrations/twitter';
import { LinearTask } from '../integrations/linear';
import { buildContentGenerationContext, getRelevantContent } from '../integrations/demos-content-sources';

export interface GenerationContext {
  trigger: {
    type: 'trend' | 'linear_task' | 'news' | 'milestone' | 'influencer_tweet';
    content: string;
    url?: string;
    metadata?: any;
  };
  demosContext: {
    recentShips: LinearTask[];
    valueProp: string;
    technicalDetails?: string;
    upcomingFeatures?: string[];
  };
}

export interface GeneratedContent {
  content: string | string[];
  type: 'tweet' | 'thread';
  reasoning: string;
  relevanceScore: number;
  tags: string[];
}

const DEMOS_BRAND_VOICE = `You are the social media voice for Demos Network, a cross-chain Web3 infrastructure platform.

DEMOS VALUE PROPOSITIONS:
- Unified identity across all blockchains (CCI - Cross-Context Identity)
- True cross-chain interoperability (10+ chains: EVM, Solana, MultiversX, NEAR, TON, XRPL, APTOS, IBC, BTC)
- Web2 + Web3 bridge via DAHR (attested HTTP requests on-chain)
- Developer-first SDK with excellent DX
- L2PS subnets - private encrypted node shards for enterprise use
- DemosWork - scriptable multi-step workflows

BRAND VOICE & TONE:
- Technical but approachable - show the hard work, not just hype
- Authentic - participate in conversations, don't just broadcast
- Educational - help people understand complex topics
- Confident but not arrogant - let the tech speak for itself
- Use Demos brand colors: #2B36D9 (blue), #FF4808 (orange) for emphasis in design
- Developers respect substance over marketing fluff

CONTENT STRATEGY:
- Only comment on topics where Demos has unique perspective
- Never force product mentions if not genuinely relevant
- 60% value-add commentary, 30% educational, 10% promotional
- Crypto Twitter punishes low-effort engagement farming
- Be substantive or say nothing

WHAT DEMOS SOLVES:
- Wallet fragmentation: Users need different wallets for each chain
- Identity chaos: Same person has different addresses everywhere
- Poor DX: Complex multi-chain development
- Web2/Web3 gap: Hard to integrate traditional APIs with blockchain
- Chain lock-in: Apps can't easily go cross-chain

TECHNICAL DEPTH:
- Demos is infrastructure, not an app
- Focus on developer benefits, not end-user features (yet)
- Cross-chain is hard - acknowledge the complexity, show our approach
- Open source mindset - share learnings, celebrate community

WRITING STYLE VARIATION (mix these up!):
- Sometimes start mid-thought: "The thing about cross-chain that nobody talks about..."
- Sometimes be direct and punchy: "10 wallets. 10 chains. 1 identity. Fixed."
- Sometimes ask a provocative question: "Why do we still ask users which chain they want?"
- Sometimes use contrast: "Bridges move tokens. CCI moves YOU."
- Sometimes tell a micro-story: "Built a dApp last week. Deployed to 7 chains. Same codebase."
- Sometimes challenge assumptions: "Hot take: 'multi-chain' isn't a feature. It's table stakes."
- Sometimes use analogies: "Asking 'which chain?' is like asking 'which HTTP?'"

TONE VARIATION (rotate between these):
- Builder mode: Share what you're working on, technical details, behind-the-scenes
- Contrarian mode: Challenge popular narratives with substance
- Teacher mode: Break down complex concepts simply
- Conversation mode: Directly engage with what others are saying
- Hype mode (sparingly): Celebrate wins, launches, milestones

STRUCTURAL VARIATION (don't always use the same format):
- Single punchy sentence
- Two contrasting statements
- Question + answer
- If/then framing
- List of 3 things
- Metaphor or analogy
- Statement + emoji emphasis
- Hot take format`;

const CONTENT_TEMPLATES = {
  ship_announcement: `A new feature was just shipped in Demos Network.

Feature: {{feature_name}}
Description: {{feature_description}}
Technical context: {{technical_details}}

Create a tweet (280 chars max) that:
- Celebrates the launch with appropriate emoji (🚀 for major, ✨ for enhancement, 🔧 for tooling)
- Explains the user/developer benefit (not just technical implementation)
- Uses active, confident language
- Includes relevant hashtag if appropriate (#Web3, #CrossChain, #BuildOnDemos)
- Ends with link to docs if available

Example tone: "🚀 Solana wallet integration is live. Link your Phantom wallet to Demos CCI and use it across any chain. One identity, infinite possibilities. Docs: demos.sh/solana"`,

  trend_commentary: `People on crypto Twitter are discussing a specific issue. Create a Demos tweet that addresses their SPECIFIC pain points.

CONVERSATION TOPIC: {{topic}}
WHAT PEOPLE ARE SAYING: {{context}}
WHY DEMOS CAN HELP: {{relevance}}

ACTUAL TWEETS FROM THIS CONVERSATION (use these as inspiration!):
{{sample_tweets}}

Recent Demos activity: {{demos_context}}

CRITICAL: Your tweet MUST respond to a SPECIFIC point from the sample tweets above.
- Pick ONE concrete complaint, question, or observation from the tweets
- Address that specific point with Demos' solution or perspective
- Be conversational - like you're joining a discussion, not broadcasting

DON'T write generic takes like:
❌ "Cross-chain identity is the future"
❌ "Web3 needs better UX"
❌ "We're building the solution"
❌ Starting with "Interoperable doesn't mean..." (overused pattern)
❌ Defining what "true interop" means (preachy)

VARY YOUR APPROACH - pick ONE of these randomly:

1. DIRECT RESPONSE: Quote or reference a specific tweet and respond
   "This ^ Except the solution exists. CCI = one identity across every chain."

2. RELATABLE FRUSTRATION: Share the pain, then pivot
   "Swapped chains 4 times today just to use one app. This is broken."

3. BUILDER PERSPECTIVE: Share what you're doing about it
   "We shipped cross-chain identity last month. 10 chains. One address. One UX."

4. PROVOCATIVE QUESTION: Challenge the framing
   "Why are we still debating L1 vs L2 when the real question is: why do users care?"

5. CONTRARIAN TAKE: Push back on consensus
   "Hot take: 'interoperability' as a feature is cope. Users don't want bridges. They want invisible chains."

6. MICRO-STORY: Personal experience format
   "Built an app. User onboarding: connect wallet. Not 'connect wallet to chain X.' Just connect."

7. ANALOGY: Make it relatable
   "Imagine logging into Gmail and being asked 'which server?' That's Web3 UX right now."

FORMAT: Single tweet only (280 chars max). No threads for commentary.
OUTPUT: Just the tweet text. Nothing else. No explanations.

If none of the sample tweets give you a specific hook, respond with "SKIP".`,

  trend_educational: `People are confused about a topic. Create an educational tweet that answers a SPECIFIC question or misconception.

TOPIC: {{topic}}
WHAT PEOPLE ARE CONFUSED ABOUT: {{context}}
DEMOS ANGLE: {{relevance}}

ACTUAL TWEETS SHOWING CONFUSION:
{{sample_tweets}}

Find ONE specific misconception, question, or confusion in the tweets above and address it directly.

DON'T write:
❌ "Let me explain cross-chain identity..."
❌ "Here's what you need to know about wallets..."
❌ "Thread on interoperability 🧵"
❌ Starting with "'X' doesn't mean Y. True X = Z" (overused definition pattern)
❌ Preachy corrections that sound like a lecture

VARY YOUR TEACHING STYLE - pick ONE:

1. MYTH-BUSTING: "Myth: you need a bridge to go cross-chain. Reality: with chain abstraction, you don't 'go' anywhere."

2. SIMPLE COMPARISON: "Bridges move your tokens. CCI moves YOU. Big difference."

3. CONCRETE EXAMPLE: "Example: I have one Demos identity. Works on Ethereum, Solana, NEAR. Same address, same history, same reputation."

4. QUICK DEFINITION: "Chain abstraction = your app works everywhere, your users choose nowhere."

5. BEFORE/AFTER: "Before CCI: 7 wallets, 7 addresses, 7 identities. After: 1."

6. REFRAME THE QUESTION: "Wrong question: 'which chain is best?' Right question: 'why should users care which chain?'"

7. DEVELOPER ANGLE: "If you're still writing chain-specific code in 2024, you're building technical debt."

FORMAT: Single tweet (280 chars max). Be punchy and specific.
OUTPUT: Just the tweet text. Nothing else. No preamble, no "Here's the tweet:" - just the content.

If no clear misconception to address, respond with "SKIP".`,

  educational_thread: `Create an educational thread about a topic relevant to Demos.

Topic: {{topic}}
Angle: {{angle}}
Demos relevance: {{demos_work}}

Create a 5-7 tweet thread that:
- Starts with a hook that promises value
- Explains the problem clearly
- Shows technical depth
- References Demos' approach naturally (not forced)
- Ends with a CTA (docs, faucet, or GitHub)
- Each tweet max 280 chars
- Uses numbered format (1/7, 2/7, etc.)

Example hook: "🧵 Why cross-chain identity is harder than it looks (and how we're tackling it)"`,

  weekly_digest: `Create a "This week at Demos" summary thread.

Completed tasks: {{completed_tasks}}
Metrics: {{metrics}}
Next week preview: {{upcoming}}

Create a 5-tweet thread:
1. Hook: "This week at Demos Network (Week {{week_number}})"
2-4. Highlight 3 key achievements with emojis
5. Next week teaser + growth metric + CTA

Keep each tweet under 280 chars. Celebrate wins without being boastful.`,

  influencer_narrative: `An influencer just tweeted something that's sparking conversation. Create a standalone tweet that taps into this narrative.

THE INFLUENCER TWEET:
"{{tweet_text}}"
— @{{author_username}} ({{engagement_summary}})

WHY THIS MATTERS FOR DEMOS:
This tweet touches on topics where Demos has a unique perspective or solution.

YOUR TASK: Write an ORIGINAL tweet (not a reply) that:
1. Rides the same narrative wave the influencer started
2. Adds Demos perspective WITHOUT directly replying to them
3. Could stand alone in anyone's timeline but clearly relates to the current conversation

APPROACHES (pick the most natural one):

1. BUILD ON THE FRUSTRATION
   If they're complaining about something Demos solves, share that frustration and hint at the fix.
   "5 wallets, 5 chains, 5 different identities. We built something better."

2. ADD A TAKE
   If they made an observation, add your own angle or contrarian view.
   "This. But the real question isn't which L1—it's why users even have to think about chains."

3. SHARE PROGRESS
   If they're discussing a problem you're actively solving, talk about what you shipped.
   "We shipped this last week. One identity across 10 chains. Same wallet, everywhere."

4. EXTEND THE THOUGHT
   If they started a good thread, contribute a related insight.
   "The wallet UX problem goes deeper. It's not about the wallet—it's about fragmenting users across chains."

5. ASK A BETTER QUESTION
   Reframe the conversation in a way that highlights what you're building.
   "Instead of 'which chain should my app deploy on?'—what if you just deployed once?"

RULES:
- DO NOT @mention the influencer (this isn't a reply)
- DO NOT quote-tweet format (RT, "This", etc)
- DO reference the narrative they started
- MAX 280 characters
- Be conversational, not corporate
- Only mention Demos/CCI if it flows naturally

OUTPUT: Just the tweet text. Nothing else.
If this tweet doesn't give you a good Demos angle, respond with "SKIP".`,
};

/**
 * AI Content Generator using Claude CLI (claude code agents)
 *
 * This mirrors the App Creation Pipeline pattern - spawning claude CLI
 * instead of using the Anthropic SDK directly.
 */
export class AIContentGenerator {
  private model = 'claude-sonnet-4-5-20250929';
  private claudePath: string | null = null;

  constructor(_apiKey?: string) {
    // API key not used - we use Claude CLI which handles auth
    this.claudePath = this.findClaudeCLI();
    if (!this.claudePath) {
      console.warn('Claude CLI not found. AI generation will be limited.');
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
        '--print',              // Output result to stdout
        '--model', 'sonnet',    // Use model alias for faster resolution
        '--disallowed-tools', 'Bash,Edit,Write,Read,Glob,Grep,Task,WebFetch,WebSearch', // Disable tools - not needed for generation
        '--mcp-config', '{"mcpServers":{}}', // Disable all MCP servers
        '-p', prompt,           // Pass prompt directly
      ];

      console.log(`[AIGenerator] Executing Claude CLI at: ${this.claudePath}`);
      console.log(`[AIGenerator] Prompt length: ${prompt.length} chars`);

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
        const chunk = data.toString();
        stderr += chunk;
        if (chunk.trim()) {
          console.log(`[AIGenerator] stderr: ${chunk.trim().substring(0, 200)}`);
        }
      });

      // Timeout handler
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
   * Generate content based on context
   */
  async generate(context: GenerationContext): Promise<GeneratedContent | null> {
    const { trigger, demosContext } = context;

    let template: string;
    let variables: Record<string, string> = {};

    // Select template based on trigger type
    switch (trigger.type) {
      case 'linear_task':
        template = CONTENT_TEMPLATES.ship_announcement;
        variables = {
          feature_name: trigger.content,
          feature_description: trigger.metadata?.description || '',
          technical_details: trigger.metadata?.technicalDetails || '',
        };
        break;

      case 'trend':
        // Use educational template for high-relevance topics, commentary for others
        const isHighRelevance = trigger.metadata?.relevance?.includes('Directly relevant');
        template = isHighRelevance
          ? CONTENT_TEMPLATES.trend_educational
          : CONTENT_TEMPLATES.trend_commentary;

        // Format sample tweets with numbers for better readability
        const formattedTweets = (trigger.metadata?.sampleTweets || [])
          .map((tweet: string, i: number) => `[${i + 1}] "${tweet}"`)
          .join('\n\n');

        variables = {
          topic: trigger.content,
          context: trigger.metadata?.context || '',
          relevance: trigger.metadata?.relevance || '',
          sample_tweets: formattedTweets || 'No sample tweets available',
          demos_context: this.formatDemosContext(demosContext),
        };
        break;

      case 'milestone':
        template = CONTENT_TEMPLATES.weekly_digest;
        variables = {
          completed_tasks: demosContext.recentShips.map(t => t.title).join('\n'),
          metrics: trigger.metadata?.metrics || '',
          upcoming: demosContext.upcomingFeatures?.join(', ') || '',
          week_number: trigger.metadata?.weekNumber || '',
        };
        break;

      case 'influencer_tweet':
        template = CONTENT_TEMPLATES.influencer_narrative;
        const engagement = trigger.metadata?.engagement || {};
        const engagementSummary = `${engagement.likes || 0} likes, ${engagement.retweets || 0} RTs`;
        variables = {
          tweet_text: trigger.content,
          author_username: trigger.metadata?.authorUsername || 'unknown',
          engagement_summary: engagementSummary,
        };
        break;

      default:
        return null;
    }

    // Build full prompt with brand voice context
    const taskPrompt = this.fillTemplate(template, variables);

    // Get relevant content from Demos official sources (YP, Paragraph, Sales Deck)
    const demosOfficialContext = buildContentGenerationContext(trigger.content);

    const fullPrompt = `${DEMOS_BRAND_VOICE}

---

${demosOfficialContext}

---

TASK:
${taskPrompt}

---

CRITICAL OUTPUT FORMAT:
- Output ONLY the tweet text itself
- NO preamble like "Here's the tweet:" or "Based on tweet [3]..."
- NO explanation of your reasoning
- NO meta-commentary about what you're doing
- Just the raw tweet content, nothing else
- If you cannot create authentic content, respond with just "SKIP"

WRONG OUTPUT: "Looking at these tweets, I see confusion about interop. Here's my tweet: 'Bridges move tokens...'"
CORRECT OUTPUT: "Bridges move tokens. CCI moves YOU. Big difference."`;

    try {
      const response = await this.executeClaudeCLI(fullPrompt);

      // Check if Claude skipped
      if (response === 'SKIP' || response.startsWith('SKIP:')) {
        return null;
      }

      // Parse response
      const content = this.parseResponse(response);
      const type = Array.isArray(content) ? 'thread' : 'tweet';

      return {
        content,
        type,
        reasoning: trigger.metadata?.reasoning || 'AI-generated based on context',
        relevanceScore: this.calculateRelevance(context),
        tags: this.extractTags(response),
      };
    } catch (error: any) {
      console.error('Error generating content:', error.message);
      return null;
    }
  }

  /**
   * Generate multiple content variations
   */
  async generateVariations(
    context: GenerationContext,
    count = 3
  ): Promise<GeneratedContent[]> {
    const variations: GeneratedContent[] = [];

    for (let i = 0; i < count; i++) {
      const content = await this.generate(context);
      if (content) {
        variations.push(content);
      }
    }

    return variations;
  }

  /**
   * Fill template with variables
   */
  private fillTemplate(template: string, variables: Record<string, string>): string {
    let filled = template;

    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return filled;
  }

  /**
   * Parse Claude's response into content
   *
   * IMPORTANT: Be strict about what constitutes a thread!
   * Only treat as thread if:
   * 1. Contains explicit "---" separators (our preferred format)
   * 2. Contains numbered format like "1/5", "2/5" etc.
   *
   * DO NOT treat double newlines alone as thread indicator -
   * that was causing too many single tweets to become threads.
   */
  private parseResponse(response: string): string | string[] {
    // First, strip out any meta-commentary Claude might include
    let cleaned = this.stripMetaCommentary(response);

    // Check for explicit thread separator "---" (our preferred format)
    const hasThreadSeparator = /\n---\n/.test(cleaned);

    // Check for numbered thread format like "1/5", "2/5"
    const threadRegex = /\d+\/\d+/;
    const hasNumberedFormat = threadRegex.test(cleaned);

    // Only treat as thread if EXPLICIT thread markers are present
    if (hasThreadSeparator) {
      // Split by "---" separator
      return cleaned
        .split(/\n---\n/)
        .map(tweet => tweet.trim())
        .filter(tweet => tweet.length > 0 && tweet !== 'SKIP');
    }

    if (hasNumberedFormat) {
      // Split by numbered tweets (1/5, 2/5, etc.)
      return cleaned
        .split(/\d+\/\d+/)
        .map(tweet => tweet.trim())
        .filter(tweet => tweet.length > 0 && tweet !== 'SKIP');
    }

    // Default: treat as single tweet (even if it has paragraph breaks)
    // This prevents double-newlines in a single tweet from being split
    return cleaned.trim();
  }

  /**
   * Strip out meta-commentary that Claude sometimes adds before the actual tweet
   * Examples of patterns to remove:
   * - "Looking at these tweets, I can identify..."
   * - "Here's the tweet:"
   * - "Based on tweet [3]..."
   */
  private stripMetaCommentary(response: string): string {
    let cleaned = response;

    // Common patterns that indicate meta-commentary before actual content
    const metaPatterns = [
      // "Looking at these tweets..." followed by actual content
      /^Looking at (?:these|the) tweets?.*?\n+(?:Here'?s?(?: the)? (?:tweet|my (?:response|tweet)):?\s*\n+)?/is,
      // "Here's the tweet:" or "Here's my response:"
      /^Here'?s?(?: the| my)? (?:tweet|response):?\s*\n+/i,
      // "Based on tweet [N]..."
      /^Based on (?:tweet )?\[?\d+\]?.*?\n+/i,
      // "I'll address..." or "I'm addressing..."
      /^I'?(?:ll|m) (?:address|respond|focus).*?\n+/i,
      // "From the tweets above..."
      /^From the tweets? (?:above|provided).*?\n+/i,
      // "The misconception in tweet [N]..."
      /^The (?:misconception|confusion|question) in (?:tweet )?\[?\d+\]?.*?\n+/i,
      // Numbered reference like "[3] shows..." at the start
      /^\[?\d+\]? (?:shows|mentions|says|asks).*?\n+/i,
    ];

    for (const pattern of metaPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Also look for "Here's the tweet:" or similar in the middle of content
    // and extract only what comes after
    const hereIsMatch = cleaned.match(/Here'?s?(?: the| my)? (?:tweet|response):?\s*\n+(.+)/is);
    if (hereIsMatch) {
      cleaned = hereIsMatch[1];
    }

    return cleaned.trim();
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(context: GenerationContext): number {
    const { trigger } = context;
    let score = 0.5; // Base score

    // Boost for certain trigger types
    if (trigger.type === 'linear_task') score += 0.2;
    if (trigger.type === 'trend') score += 0.15;

    // Boost if recent ships are mentioned
    if (context.demosContext.recentShips.length > 0) score += 0.1;

    // Boost if highly relevant keywords
    const highValueKeywords = ['cross-chain', 'identity', 'wallet', 'interoperability'];
    const hasHighValueKeyword = highValueKeywords.some(kw =>
      trigger.content.toLowerCase().includes(kw)
    );
    if (hasHighValueKeyword) score += 0.15;

    return Math.min(score, 1.0);
  }

  /**
   * Extract hashtags and mentions from content
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Extract hashtags
    const hashtagMatches = content.match(/#\w+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches);
    }

    return tags;
  }

  /**
   * Format Demos context for prompts
   */
  private formatDemosContext(context: any): string {
    const parts: string[] = [];

    if (context.recentShips?.length > 0) {
      parts.push('Recent ships:');
      context.recentShips.forEach((ship: LinearTask, i: number) => {
        parts.push(`${i + 1}. ${ship.title}`);
      });
    }

    if (context.upcomingFeatures?.length > 0) {
      parts.push('\nUpcoming:');
      parts.push(context.upcomingFeatures.join(', '));
    }

    return parts.join('\n');
  }
}

export default AIContentGenerator;
