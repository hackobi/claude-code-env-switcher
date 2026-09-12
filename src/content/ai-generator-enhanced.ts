import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import { Tweet } from '../integrations/twitter';
import { LinearTask } from '../integrations/linear';
import { buildContentGenerationContext, getRelevantContent } from '../integrations/demos-content-sources';
import { GenerationContext, GeneratedContent, DEMOS_BRAND_VOICE, CONTENT_TEMPLATES } from './ai-generator';

export interface ReasoningStep {
  step: string;
  analysis: string;
  decision: string;
  confidence: number;
}

export interface EnhancedGeneratedContent extends GeneratedContent {
  reasoning_steps: ReasoningStep[];
  context_analysis: ContextAnalysis;
  strategy: ContentStrategy;
  quality_assessment: QualityAssessment;
}

export interface ContextAnalysis {
  conversation_sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated' | 'excited';
  key_themes: string[];
  pain_points: string[];
  audience_sophistication: 'technical' | 'general' | 'mixed';
  conversation_momentum: 'rising' | 'declining' | 'stable';
  opportunity_score: number;
}

export interface ContentStrategy {
  approach: 'contrarian' | 'supportive' | 'educational' | 'solution-focused' | 'provocative';
  tone: 'technical' | 'approachable' | 'conversational' | 'confident' | 'humble';
  structure: 'single-point' | 'before-after' | 'question-answer' | 'problem-solution' | 'analogy';
  demos_angle: string;
  engagement_hooks: string[];
}

export interface QualityAssessment {
  brand_alignment: number;
  engagement_potential: number;
  authenticity_score: number;
  technical_accuracy: number;
  improvement_suggestions: string[];
  final_score: number;
}

const REASONING_PROMPTS = {
  context_analysis: `You are analyzing a crypto Twitter conversation to understand the context before generating content.

CONVERSATION TOPIC: {{topic}}
SAMPLE TWEETS:
{{sample_tweets}}

METADATA:
{{metadata}}

Analyze this conversation and provide:

1. SENTIMENT ANALYSIS:
   - Overall emotional tone (positive/negative/neutral/frustrated/excited)
   - Key emotional drivers and reactions

2. THEME IDENTIFICATION:
   - Main topics being discussed
   - Underlying concerns or interests
   - Technical vs general discussion level

3. PAIN POINT EXTRACTION:
   - Specific frustrations people are expressing
   - Problems they're trying to solve
   - Gaps in understanding

4. AUDIENCE ASSESSMENT:
   - Technical sophistication level
   - Participant types (developers, users, investors, etc.)
   - Conversation dynamics

5. OPPORTUNITY SCORING (1-10):
   - How relevant is this to Demos Network's value props?
   - Potential for meaningful engagement
   - Risk of coming across as promotional

Format your response as JSON:
{
  "conversation_sentiment": "frustrated",
  "key_themes": ["cross-chain complexity", "wallet fragmentation"],
  "pain_points": ["managing multiple wallets", "different addresses per chain"],
  "audience_sophistication": "technical",
  "conversation_momentum": "rising",
  "opportunity_score": 8,
  "analysis_reasoning": "Detailed explanation of your analysis"
}`,

  strategy_selection: `Based on the context analysis, determine the optimal content strategy for Demos Network.

CONTEXT ANALYSIS:
{{context_analysis}}

DEMOS VALUE PROPOSITIONS:
- Cross-Context Identity (CCI): One identity across all blockchains
- True cross-chain interoperability (10+ chains)
- Web2/Web3 bridge via DAHR (attested HTTP requests)
- Developer-first SDK with excellent DX
- L2PS subnets for enterprise privacy
- DemosWork scriptable workflows

STRATEGY OPTIONS:
1. CONTRARIAN: Challenge popular assumptions with Demos perspective
2. SUPPORTIVE: Validate frustrations and offer Demos solution
3. EDUCATIONAL: Explain complex concepts with Demos examples
4. SOLUTION-FOCUSED: Direct problem-solving with Demos tech
5. PROVOCATIVE: Ask better questions to reframe the conversation

For each option, consider:
- Brand alignment (1-10)
- Engagement potential (1-10)  
- Risk of appearing promotional (1-10)
- Fit with conversation context (1-10)

Select the BEST strategy and provide detailed rationale.

Format as JSON:
{
  "approach": "supportive",
  "tone": "technical",
  "structure": "problem-solution",
  "demos_angle": "CCI solves wallet fragmentation by giving users one identity across all chains",
  "engagement_hooks": ["relatability", "technical credibility", "clear solution"],
  "strategy_reasoning": "Why this approach was selected",
  "alternative_approaches_considered": ["contrarian", "educational"],
  "risk_assessment": "Low risk of appearing promotional due to genuine solution fit"
}`,

  content_generation: `Generate content following the selected strategy with explicit reasoning.

STRATEGY:
{{strategy}}

CONTEXT:
{{context}}

BRAND VOICE:
{{brand_voice}}

OFFICIAL DEMOS CONTENT:
{{official_content}}

TEMPLATE GUIDANCE:
{{template}}

Generate content following this process:

1. IDENTIFY SPECIFIC HOOK:
   - Which exact tweet/comment are you responding to?
   - What specific problem or statement will you address?

2. CRAFT OPENING:
   - How will you start to grab attention?
   - Connection to the ongoing conversation

3. DELIVER VALUE:
   - What unique Demos perspective can you add?
   - How does this genuinely help the conversation?

4. CONCLUDE EFFECTIVELY:
   - Call to action, question, or memorable statement
   - Avoid promotional endings unless natural

5. QUALITY CHECK:
   - Does this sound authentic?
   - Would a technical audience respect this?
   - Is the Demos mention natural or forced?

CRITICAL OUTPUT REQUIREMENTS:
- "content" field must be ONLY the finished tweet text (280 chars max)
- NO reasoning, NO meta-commentary, NO "looking at" or "let me" phrases
- Just the final polished content ready to post

Output format (JSON ONLY):
{
  "content": "The actual tweet text ready to post - no reasoning or meta-commentary",
  "hook_analysis": "Which specific point you're addressing",
  "value_proposition": "What unique value you're adding", 
  "demos_integration": "How Demos is mentioned naturally",
  "authenticity_check": "Why this sounds genuine",
  "generation_reasoning": "Step-by-step thinking process"
}`,

  self_critique: `Review and improve the generated content against Demos brand standards.

GENERATED CONTENT:
{{content}}

GENERATION REASONING:
{{reasoning}}

BRAND STANDARDS:
{{brand_standards}}

EVALUATION CRITERIA:
1. Brand Alignment (1-10):
   - Technical but approachable tone
   - Authentic participation vs broadcasting
   - Educational value vs hype
   - Confidence without arrogance

2. Engagement Potential (1-10):
   - Conversation fit
   - Hook effectiveness  
   - Value to readers
   - Shareability

3. Authenticity (1-10):
   - Natural language
   - Genuine contribution
   - Non-promotional tone
   - Technical credibility

4. Technical Accuracy (1-10):
   - Correct use of terms
   - Accurate representation of Demos
   - Technical depth appropriate for audience

Provide scores and improvement suggestions:

{
  "brand_alignment": 8,
  "engagement_potential": 7,
  "authenticity_score": 9,
  "technical_accuracy": 8,
  "improvement_suggestions": [
    "Make opening more conversational",
    "Reduce technical jargon for broader appeal"
  ],
  "final_score": 8.0,
  "approval_recommendation": "approve_with_suggestions",
  "critique_reasoning": "Detailed analysis of strengths and weaknesses"
}`,

  content_refinement: `Improve the content based on critique while maintaining its core message.

ORIGINAL CONTENT:
{{original_content}}

CRITIQUE RESULTS:
{{critique}}

IMPROVEMENT AREAS:
{{improvements}}

Create an improved version that:
1. Addresses the specific feedback points
2. Maintains the original message and strategy
3. Preserves authentic tone and brand voice
4. Enhances engagement potential

Show your refinement process:

{
  "refined_content": "Improved tweet text",
  "changes_made": [
    "Specific changes and rationale"
  ],
  "improvement_reasoning": "How each change addresses the critique",
  "preserved_elements": "What was kept from original",
  "final_assessment": "Why this version is better"
}`
};

/**
 * Enhanced AI Content Generator with multi-step reasoning
 * Uses Sequential thinking patterns for better inference
 */
export class EnhancedAIContentGenerator {
  private model = 'claude-sonnet-4-5-20250929';
  private claudePath: string | null = null;

  constructor(_apiKey?: string) {
    this.claudePath = this.findClaudeCLI();
    if (!this.claudePath) {
      console.warn('Claude CLI not found. AI generation will be limited.');
    }
  }

  /**
   * Enhanced generation with multi-step reasoning
   */
  async generate(context: GenerationContext): Promise<EnhancedGeneratedContent | null> {
    console.log('🧠 Starting enhanced AI generation with multi-step reasoning...');

    try {
      // Step 1: Analyze context deeply
      console.log('📊 Step 1: Context Analysis');
      const contextAnalysis = await this.analyzeContext(context);
      
      // Step 2: Select optimal strategy
      console.log('🎯 Step 2: Strategy Selection');
      const strategy = await this.selectStrategy(contextAnalysis, context);
      
      // Step 3: Generate content with reasoning
      console.log('✍️  Step 3: Content Generation');
      const generationResult = await this.generateWithReasoning(context, contextAnalysis, strategy);
      
      // Step 4: Self-critique and assess quality
      console.log('🔍 Step 4: Quality Assessment');
      const qualityAssessment = await this.assessQuality(generationResult.content, generationResult.reasoning, context);
      
      // Step 5: Refine if needed
      console.log('✨ Step 5: Content Refinement');
      let finalContent = generationResult.content;
      let finalReasoning = generationResult.reasoning;
      
      if (qualityAssessment.final_score < 7.0) {
        console.log(`⚠️  Quality score ${qualityAssessment.final_score} - attempting refinement`);
        const refinementResult = await this.refineContent(generationResult.content, qualityAssessment);
        if (refinementResult) {
          finalContent = refinementResult.content;
          finalReasoning += '\n\nRefinement: ' + refinementResult.reasoning;
        }
      }

      // Compile all reasoning steps
      const reasoningSteps: ReasoningStep[] = [
        {
          step: 'Context Analysis',
          analysis: contextAnalysis.analysis_reasoning || 'Analyzed conversation context and themes',
          decision: `Identified ${contextAnalysis.key_themes.length} key themes and ${contextAnalysis.pain_points.length} pain points`,
          confidence: contextAnalysis.opportunity_score / 10
        },
        {
          step: 'Strategy Selection', 
          analysis: strategy.strategy_reasoning || 'Selected optimal content approach',
          decision: `Chose ${strategy.approach} approach with ${strategy.tone} tone`,
          confidence: 0.8
        },
        {
          step: 'Content Generation',
          analysis: generationResult.reasoning,
          decision: `Generated ${finalContent.length > 100 ? 'thread' : 'tweet'} content`,
          confidence: 0.9
        },
        {
          step: 'Quality Assessment',
          analysis: qualityAssessment.critique_reasoning || 'Evaluated against brand standards',
          decision: `Final score: ${qualityAssessment.final_score}/10`,
          confidence: qualityAssessment.final_score / 10
        }
      ];

      const enhancedResult: EnhancedGeneratedContent = {
        content: finalContent,
        type: Array.isArray(finalContent) ? 'thread' : 'tweet',
        reasoning: finalReasoning,
        relevanceScore: contextAnalysis.opportunity_score / 10,
        tags: this.extractTags(finalContent),
        reasoning_steps: reasoningSteps,
        context_analysis: contextAnalysis,
        strategy: strategy,
        quality_assessment: qualityAssessment
      };

      console.log(`✅ Enhanced generation complete - Quality score: ${qualityAssessment.final_score}/10`);
      return enhancedResult;

    } catch (error: any) {
      console.error('❌ Enhanced generation failed:', error.message);
      return null;
    }
  }

  private async analyzeContext(context: GenerationContext): Promise<ContextAnalysis> {
    const { trigger } = context;
    
    const variables = {
      topic: trigger.content,
      sample_tweets: this.formatSampleTweets(trigger.metadata?.sampleTweets || []),
      metadata: JSON.stringify(trigger.metadata || {}, null, 2)
    };

    const prompt = this.fillTemplate(REASONING_PROMPTS.context_analysis, variables);
    const response = await this.executeClaudeCLI(prompt);
    
    try {
      const analysis = JSON.parse(response);
      return analysis as ContextAnalysis;
    } catch (error) {
      // Fallback if JSON parsing fails
      console.warn('Context analysis parsing failed, using fallback');
      return {
        conversation_sentiment: 'neutral',
        key_themes: [trigger.content],
        pain_points: ['general crypto UX'],
        audience_sophistication: 'mixed',
        conversation_momentum: 'stable',
        opportunity_score: 5
      };
    }
  }

  private async selectStrategy(contextAnalysis: ContextAnalysis, context: GenerationContext): Promise<ContentStrategy> {
    const variables = {
      context_analysis: JSON.stringify(contextAnalysis, null, 2)
    };

    const prompt = this.fillTemplate(REASONING_PROMPTS.strategy_selection, variables);
    const response = await this.executeClaudeCLI(prompt);
    
    try {
      const strategy = JSON.parse(response);
      return strategy as ContentStrategy;
    } catch (error) {
      console.warn('Strategy selection parsing failed, using fallback');
      return {
        approach: 'supportive',
        tone: 'technical',
        structure: 'problem-solution',
        demos_angle: 'Cross-chain identity solution',
        engagement_hooks: ['technical credibility', 'clear solution']
      };
    }
  }

  private async generateWithReasoning(
    context: GenerationContext, 
    contextAnalysis: ContextAnalysis, 
    strategy: ContentStrategy
  ): Promise<{ content: string, reasoning: string }> {
    
    // Get the appropriate template based on trigger type
    let template = '';
    switch (context.trigger.type) {
      case 'trend':
        template = CONTENT_TEMPLATES.trend_commentary;
        break;
      case 'influencer_tweet':
        template = CONTENT_TEMPLATES.influencer_narrative;
        break;
      case 'linear_task':
        template = CONTENT_TEMPLATES.ship_announcement;
        break;
      default:
        template = CONTENT_TEMPLATES.trend_commentary;
    }

    const variables = {
      strategy: JSON.stringify(strategy, null, 2),
      context: JSON.stringify(contextAnalysis, null, 2),
      brand_voice: DEMOS_BRAND_VOICE,
      official_content: buildContentGenerationContext(context.trigger.content),
      template: template
    };

    const prompt = this.fillTemplate(REASONING_PROMPTS.content_generation, variables);
    const response = await this.executeClaudeCLI(prompt);
    
    try {
      const result = JSON.parse(response);
      return {
        content: result.content,
        reasoning: result.generation_reasoning
      };
    } catch (error) {
      // Fallback to extracting content from response if JSON parsing fails
      console.warn('Content generation parsing failed, attempting content extraction');
      
      // Try to extract content from common patterns
      let extractedContent = response;
      
      // Pattern 1: Look for quoted content after "content": 
      const quotedMatch = response.match(/"content":\s*"([^"]+)"/);
      if (quotedMatch) {
        extractedContent = quotedMatch[1];
      } else {
        // Pattern 2: Look for content after common prefixes
        const prefixPatterns = [
          /(?:Here's|Here is) (?:a|the) (?:tweet|content):\s*"([^"]+)"/i,
          /(?:Tweet|Content):\s*"([^"]+)"/i,
          /^"([^"]+)"$/m  // Just quoted text on a line
        ];
        
        for (const pattern of prefixPatterns) {
          const match = response.match(pattern);
          if (match) {
            extractedContent = match[1];
            break;
          }
        }
        
        // Pattern 3: If still no match, try to find the most tweet-like line
        if (extractedContent === response) {
          const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          for (const line of lines) {
            // Skip obvious reasoning/meta lines
            if (line.toLowerCase().includes('looking at') || 
                line.toLowerCase().includes('i can see') ||
                line.toLowerCase().includes('let me') ||
                line.toLowerCase().includes('here\'s a refined') ||
                line.length > 280) {
              continue;
            }
            // Take first remaining line that looks like actual content
            if (line.length > 20 && !line.includes(':')) {
              extractedContent = line;
              break;
            }
          }
        }
      }
      
      return {
        content: extractedContent,
        reasoning: 'Enhanced reasoning with content extraction fallback'
      };
    }
  }

  private async assessQuality(content: string, reasoning: string, context: GenerationContext): Promise<QualityAssessment> {
    const variables = {
      content: content,
      reasoning: reasoning,
      brand_standards: DEMOS_BRAND_VOICE
    };

    const prompt = this.fillTemplate(REASONING_PROMPTS.self_critique, variables);
    const response = await this.executeClaudeCLI(prompt);
    
    try {
      const assessment = JSON.parse(response);
      return assessment as QualityAssessment;
    } catch (error) {
      console.warn('Quality assessment parsing failed, using fallback');
      return {
        brand_alignment: 7,
        engagement_potential: 7,
        authenticity_score: 7,
        technical_accuracy: 7,
        improvement_suggestions: ['Review for brand alignment'],
        final_score: 7.0
      };
    }
  }

  private async refineContent(content: string, critique: QualityAssessment): Promise<{ content: string, reasoning: string } | null> {
    if (critique.improvement_suggestions.length === 0) {
      return null;
    }

    const variables = {
      original_content: content,
      critique: JSON.stringify(critique, null, 2),
      improvements: critique.improvement_suggestions.join('\n- ')
    };

    const prompt = this.fillTemplate(REASONING_PROMPTS.content_refinement, variables);
    
    try {
      const response = await this.executeClaudeCLI(prompt);
      const result = JSON.parse(response);
      return {
        content: result.refined_content,
        reasoning: result.improvement_reasoning
      };
    } catch (error) {
      console.warn('Content refinement failed:', error);
      return null;
    }
  }

  // Utility methods (copied from original generator)
  private findClaudeCLI(): string | null {
    const home = process.env['HOME'] || '';
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

    try {
      const stdout = execSync('which claude', { encoding: 'utf-8', timeout: 5000 });
      if (stdout.trim()) {
        return stdout.trim();
      }
    } catch {
      // Not in PATH
    }

    return null;
  }

  private async executeClaudeCLI(prompt: string, timeout = 180000): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.claudePath) {
        reject(new Error('Claude CLI not found. Please install claude-code.'));
        return;
      }

      const args = [
        '--print',
        '--model', 'sonnet',
        '-p', prompt,
      ];

      const childProcess = spawn(this.claudePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
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
          console.error(`[AIGenerator] Claude CLI failed with exit code ${exitCode}`);
          console.error(`[AIGenerator] STDERR: ${stderr}`);
          console.error(`[AIGenerator] STDOUT: ${stdout}`);
          console.error(`[AIGenerator] Prompt first 500 chars: ${prompt.substring(0, 500)}`);
          reject(new Error(`Claude CLI exited with code ${exitCode}: ${stderr}`));
        }
      });

      childProcess.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private fillTemplate(template: string, variables: Record<string, string>): string {
    let filled = template;
    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return filled;
  }

  private formatSampleTweets(tweets: string[]): string {
    if (!tweets || tweets.length === 0) {
      return 'No sample tweets available';
    }
    
    return tweets
      .slice(0, 5) // Limit to 5 tweets to avoid prompt bloat
      .map((tweet, i) => `[${i + 1}] "${tweet}"`)
      .join('\n\n');
  }

  private extractTags(content: string | string[]): string[] {
    const text = Array.isArray(content) ? content.join(' ') : content;
    const tags = [];
    
    if (text.toLowerCase().includes('cross-chain')) tags.push('cross-chain');
    if (text.toLowerCase().includes('identity')) tags.push('identity');
    if (text.toLowerCase().includes('wallet')) tags.push('wallet');
    if (text.toLowerCase().includes('interop')) tags.push('interoperability');
    if (text.toLowerCase().includes('demos')) tags.push('demos');
    
    return tags;
  }
}