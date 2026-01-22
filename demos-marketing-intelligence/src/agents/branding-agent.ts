import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import { BrandVoiceProfile } from '../learning/brand-voice-learner';

export interface BrandReviewResult {
  score: number;              // 0-1, overall brand alignment
  alignment: 'excellent' | 'good' | 'needs-work' | 'off-brand';
  toneAssessment: {
    technical: number;        // 0-1, how technical it feels
    approachable: number;     // 0-1, how approachable it feels
    balance: 'good' | 'too-technical' | 'too-casual';
  };
  redFlags: string[];         // Marketing clichés, hype, off-brand language
  suggestions: string[];      // How to improve
  approved: boolean;
  reasoning: string;
}

export interface VisualBrandReview {
  colorAlignment: number;     // 0-1, brand color usage
  styleAlignment: number;     // 0-1, matches Demos aesthetic
  professionalismScore: number; // 0-1
  suggestions: string[];
  approved: boolean;
}

const DEMOS_BRAND_IDENTITY = `
DEMOS NETWORK BRAND IDENTITY

Core Values:
- Technical Excellence: We build hard tech, not hype
- Authenticity: Show the work, not just the results
- Developer-First: Our audience is technical, respect their intelligence
- Educational: Help people understand complex concepts
- Humble Confidence: Proud of our work without being arrogant

Voice & Tone:
- Technical but Approachable: Explain complex topics clearly without dumbing down
- Conversational but Professional: Like a senior engineer explaining to a peer
- Honest: Acknowledge challenges, don't oversell
- Substantive: Every tweet should add value or say nothing

What We DO Say:
- "Cross-chain identity is hard. Here's how we're tackling it..."
- "Just shipped Solana integration. 140 lines of code, tested on devnet."
- "Wallet fragmentation is a real problem. Demos CCI solves this by..."
- "Here's what we learned building this feature..."

What We DON'T Say:
- "Revolutionary", "game-changing", "paradigm shift"
- "The future of Web3"
- "To the moon", "LFG", "WAGMI"
- Generic hype without substance
- Overpromising or marketing speak

Colors:
- Primary: #2B36D9 (Palatinate Blue) - Trust, technology, stability
- Secondary: #FF4808 (Solar Flame) - Energy, action, innovation
- Accent: #FF35F9 (Magenta), #00DAFF (Cyan)
- Backgrounds: #010109 (dark), #F2F2F0 (light)

Typography:
- UI: Inter (clean, modern, readable)
- Code: Source Code Pro (technical, precise)

Visual Style:
- Minimal geometric design
- Precise, intentional
- Technical but not cold
- Inspired by Linear, Stripe, Vercel
`;

/**
 * Branding Agent using Claude CLI
 *
 * Reviews and improves content for brand alignment using claude CLI
 * instead of direct Anthropic SDK calls.
 */
export class BrandingAgent {
  private model = 'claude-sonnet-4-5-20250929';
  private claudePath: string | null = null;
  private brandProfile: BrandVoiceProfile | null = null;
  private useLearnedVoice: boolean;

  constructor(_apiKey?: string, learnedProfile?: BrandVoiceProfile) {
    // API key not used - we use Claude CLI which handles auth
    this.claudePath = this.findClaudeCLI();
    if (!this.claudePath) {
      console.warn('Claude CLI not found. Brand review will be limited.');
    }
    this.brandProfile = learnedProfile || null;
    this.useLearnedVoice = !!learnedProfile;
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
   * Update the brand voice profile
   */
  updateProfile(profile: BrandVoiceProfile) {
    this.brandProfile = profile;
    this.useLearnedVoice = true;
  }

  /**
   * Get current brand identity (learned or default)
   */
  private getBrandIdentity(): string {
    if (this.useLearnedVoice && this.brandProfile) {
      return this.generateGuidelinesFromProfile(this.brandProfile);
    }
    return DEMOS_BRAND_IDENTITY;
  }

  /**
   * Review content for brand alignment
   */
  async reviewContent(content: string, context?: string): Promise<BrandReviewResult> {
    const prompt = `You are Demos Network's brand guardian. Your job is to ensure all content maintains our authentic, technical-but-approachable voice.

BRAND IDENTITY:
${this.getBrandIdentity()}

CONTENT TO REVIEW:
"${content}"

${context ? `CONTEXT: ${context}` : ''}

ANALYSIS REQUIRED:
1. Overall brand alignment (0-1 score)
2. Tone balance (technical vs approachable, 0-1 each)
3. Red flags (marketing clichés, hype words, off-brand language)
4. Specific suggestions for improvement
5. Final decision: APPROVED or NEEDS_REVISION

Return ONLY valid JSON (no markdown, no explanation):
{
  "score": 0.0-1.0,
  "alignment": "excellent|good|needs-work|off-brand",
  "toneAssessment": {
    "technical": 0.0-1.0,
    "approachable": 0.0-1.0,
    "balance": "good|too-technical|too-casual"
  },
  "redFlags": ["specific issues found"],
  "suggestions": ["specific improvements"],
  "approved": true/false,
  "reasoning": "why you made this decision"
}`;

    try {
      const response = await this.executeClaudeCLI(prompt);

      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis as BrandReviewResult;
    } catch (error: any) {
      console.error('Brand review failed:', error.message);
      // Return a default review on failure
      return {
        score: 0.5,
        alignment: 'needs-work',
        toneAssessment: {
          technical: 0.5,
          approachable: 0.5,
          balance: 'good'
        },
        redFlags: ['Review failed - please check manually'],
        suggestions: [],
        approved: false,
        reasoning: `Brand review failed: ${error.message}`
      };
    }
  }

  /**
   * Suggest improved version of content
   */
  async improveContent(
    content: string,
    issues: string[],
    context?: string
  ): Promise<string> {
    const prompt = `You are Demos Network's brand voice expert.

BRAND IDENTITY:
${this.getBrandIdentity()}

ORIGINAL CONTENT:
"${content}"

ISSUES IDENTIFIED:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

${context ? `CONTEXT: ${context}` : ''}

TASK: Rewrite this content to fix the issues while maintaining the core message.

Requirements:
- Keep the same essential information
- Match Demos' technical-but-approachable tone
- Remove any marketing clichés or hype
- Make it substantive and authentic
- Similar length to original

Return ONLY the improved content, no explanation.`;

    try {
      const response = await this.executeClaudeCLI(prompt);
      return response.trim();
    } catch (error: any) {
      console.error('Content improvement failed:', error.message);
      return content; // Return original on failure
    }
  }

  /**
   * Review visual content for brand alignment
   */
  async reviewVisual(imagePrompt: string): Promise<VisualBrandReview> {
    const prompt = `You are Demos Network's visual brand guardian.

BRAND VISUAL IDENTITY:
${this.getBrandIdentity()}

IMAGE GENERATION PROMPT:
"${imagePrompt}"

ANALYSIS:
1. Does it use Demos brand colors? (#2B36D9 blue, #FF4808 orange)
2. Does it match our minimal, geometric, technical aesthetic?
3. Is it professional and suitable for a tech company?
4. Any suggestions for improvement?

Return ONLY valid JSON:
{
  "colorAlignment": 0.0-1.0,
  "styleAlignment": 0.0-1.0,
  "professionalismScore": 0.0-1.0,
  "suggestions": ["improvements"],
  "approved": true/false
}`;

    try {
      const response = await this.executeClaudeCLI(prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]) as VisualBrandReview;
    } catch (error: any) {
      console.error('Visual brand review failed:', error.message);
      return {
        colorAlignment: 0.5,
        styleAlignment: 0.5,
        professionalismScore: 0.5,
        suggestions: ['Review failed - please check manually'],
        approved: false
      };
    }
  }

  /**
   * Generate brand-aligned image prompt
   */
  async createImagePrompt(
    contentType: 'ship' | 'trend' | 'educational' | 'weekly',
    message: string
  ): Promise<string> {
    const prompt = `You are Demos Network's visual content strategist.

BRAND VISUAL IDENTITY:
${this.getBrandIdentity()}

CONTENT TYPE: ${contentType}
MESSAGE: "${message}"

Create a DALL-E image generation prompt that:
1. Represents the message visually
2. Uses Demos brand colors (#2B36D9 blue, #FF4808 orange)
3. Matches our minimal, technical aesthetic
4. Is suitable for social media (professional, clean)
5. Includes NO TEXT in the image

Return ONLY the DALL-E prompt, optimized for best results.`;

    try {
      const response = await this.executeClaudeCLI(prompt);
      return response.trim();
    } catch (error: any) {
      console.error('Image prompt creation failed:', error.message);
      // Return a default prompt
      return `Minimal geometric design with deep blue (#2B36D9) and orange (#FF4808) colors, abstract tech visualization, clean professional style, no text`;
    }
  }

  /**
   * Batch review multiple pieces of content
   */
  async batchReview(
    contents: Array<{ content: string; context?: string }>
  ): Promise<BrandReviewResult[]> {
    const results: BrandReviewResult[] = [];

    for (const item of contents) {
      const result = await this.reviewContent(item.content, item.context);
      results.push(result);

      // Rate limiting
      await this.sleep(1000);
    }

    return results;
  }

  /**
   * Get brand guidelines summary
   */
  getBrandGuidelines(): string {
    return this.getBrandIdentity();
  }

  /**
   * Generate guidelines text from learned profile
   */
  private generateGuidelinesFromProfile(profile: BrandVoiceProfile): string {
    return `DEMOS NETWORK BRAND VOICE (Learned from @DemosNetwork)
Last Updated: ${new Date(profile.lastUpdated).toLocaleDateString()}
Based on ${profile.samplesAnalyzed} analyzed tweets

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

Colors (Visual Identity):
- Primary: #2B36D9 (Palatinate Blue)
- Secondary: #FF4808 (Solar Flame)
- Accent: #FF35F9 (Magenta), #00DAFF (Cyan)

Visual Style:
- Minimal geometric design
- Technical but not cold
- Inspired by Linear, Stripe, Vercel`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BrandingAgent;
