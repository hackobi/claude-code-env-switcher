import { Tweet, DEMOS_KEYWORDS } from '../integrations/twitter';
import { LinearTask } from '../integrations/linear';

export interface ScoredContent {
  content: any;
  score: number;
  reasoning: string[];
  category: 'high' | 'medium' | 'low';
}

/**
 * Relevance scoring system for Demos Network
 * Scores content based on alignment with Demos' value props and strategy
 */
export class RelevanceScorer {
  private readonly HIGH_VALUE_KEYWORDS = [
    'cross-chain',
    'cross chain',
    'multichain',
    'multi-chain',
    'wallet fragmentation',
    'blockchain identity',
    'decentralized identity',
    'did',
    'ssi',
    'interoperability',
    'chain abstraction',
    'unified wallet',
  ];

  private readonly MEDIUM_VALUE_KEYWORDS = [
    'web3 ux',
    'crypto ux',
    'developer experience',
    'wallet experience',
    'blockchain ux',
    'onboarding',
    'web2 web3',
    'bridge',
    'cross-chain bridge',
  ];

  private readonly NEGATIVE_KEYWORDS = [
    'nft mint',
    'whitelist',
    'airdrop',
    'presale',
    'token launch',
    'meme coin',
    'pump',
    'degen',
  ];

  /**
   * Score a tweet for Demos relevance
   */
  scoreTweet(tweet: Tweet): ScoredContent {
    const text = tweet.text.toLowerCase();
    const reasoning: string[] = [];
    let score = 0;

    // Check high-value keywords
    const highMatches = this.HIGH_VALUE_KEYWORDS.filter(kw => text.includes(kw));
    if (highMatches.length > 0) {
      score += 0.4 * highMatches.length;
      reasoning.push(`High-value keywords: ${highMatches.join(', ')}`);
    }

    // Check medium-value keywords
    const mediumMatches = this.MEDIUM_VALUE_KEYWORDS.filter(kw => text.includes(kw));
    if (mediumMatches.length > 0) {
      score += 0.2 * mediumMatches.length;
      reasoning.push(`Medium-value keywords: ${mediumMatches.join(', ')}`);
    }

    // Penalty for negative keywords (off-brand content)
    const negativeMatches = this.NEGATIVE_KEYWORDS.filter(kw => text.includes(kw));
    if (negativeMatches.length > 0) {
      score -= 0.3 * negativeMatches.length;
      reasoning.push(`❌ Off-brand keywords: ${negativeMatches.join(', ')}`);
    }

    // Boost for high engagement (sign of quality/impact)
    const engagementScore = this.calculateEngagementScore(tweet);
    if (engagementScore > 100) {
      const boost = Math.min(0.2, engagementScore / 1000);
      score += boost;
      reasoning.push(`High engagement: ${Math.round(engagementScore)} points`);
    }

    // Boost for technical depth indicators
    const technicalIndicators = ['protocol', 'architecture', 'consensus', 'cryptography', 'evm'];
    const techMatches = technicalIndicators.filter(kw => text.includes(kw));
    if (techMatches.length > 0) {
      score += 0.15;
      reasoning.push(`Technical depth: ${techMatches.join(', ')}`);
    }

    // Normalize score to 0-1 range
    score = Math.max(0, Math.min(1, score));

    // Categorize
    let category: 'high' | 'medium' | 'low';
    if (score >= 0.7) category = 'high';
    else if (score >= 0.4) category = 'medium';
    else category = 'low';

    return {
      content: tweet,
      score,
      reasoning,
      category,
    };
  }

  /**
   * Score a Linear task for marketing worthiness
   */
  scoreLinearTask(task: LinearTask): ScoredContent {
    const reasoning: string[] = [];
    let score = 0.5; // Base score for completed tasks

    const title = task.title.toLowerCase();
    const description = task.description?.toLowerCase() || '';
    const combined = `${title} ${description}`;

    // Check for feature keywords
    const featureKeywords = ['feature', 'add', 'implement', 'integrate', 'support', 'launch'];
    if (featureKeywords.some(kw => title.includes(kw))) {
      score += 0.25;
      reasoning.push('Feature implementation');
    }

    // Check for "shipped" label
    if (task.labels.some(label => label.toLowerCase().includes('shipped'))) {
      score += 0.2;
      reasoning.push('Marked as shipped');
    }

    // Penalty for minor tasks
    const minorKeywords = ['fix typo', 'update readme', 'minor', 'cleanup'];
    if (minorKeywords.some(kw => title.includes(kw))) {
      score -= 0.4;
      reasoning.push('❌ Minor task, not shippable');
    }

    // Boost for high-value areas
    if (this.HIGH_VALUE_KEYWORDS.some(kw => combined.includes(kw))) {
      score += 0.3;
      reasoning.push('High-value feature area');
    }

    // Boost for cross-chain work
    const chains = ['solana', 'evm', 'ethereum', 'near', 'multiversx', 'ton', 'aptos'];
    const chainMatches = chains.filter(chain => combined.includes(chain));
    if (chainMatches.length > 0) {
      score += 0.2;
      reasoning.push(`Cross-chain: ${chainMatches.join(', ')}`);
    }

    // Normalize
    score = Math.max(0, Math.min(1, score));

    let category: 'high' | 'medium' | 'low';
    if (score >= 0.7) category = 'high';
    else if (score >= 0.4) category = 'medium';
    else category = 'low';

    return {
      content: task,
      score,
      reasoning,
      category,
    };
  }

  /**
   * Batch score multiple items
   */
  scoreBatch(items: (Tweet | LinearTask)[]): ScoredContent[] {
    return items.map(item => {
      if ('text' in item) {
        return this.scoreTweet(item as Tweet);
      } else {
        return this.scoreLinearTask(item as LinearTask);
      }
    });
  }

  /**
   * Filter to only high-quality content
   */
  filterHighQuality(
    scored: ScoredContent[],
    minScore = 0.6
  ): ScoredContent[] {
    return scored
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate engagement score for a tweet
   */
  private calculateEngagementScore(tweet: Tweet): number {
    const metrics = tweet.public_metrics;
    return (
      metrics.like_count * 1 +
      metrics.retweet_count * 2 +
      metrics.reply_count * 1.5 +
      metrics.quote_count * 2
    );
  }

  /**
   * Explain score in human-readable format
   */
  explainScore(scored: ScoredContent): string {
    const emoji = scored.category === 'high' ? '🟢' : scored.category === 'medium' ? '🟡' : '🔴';
    const scorePercent = Math.round(scored.score * 100);

    let explanation = `${emoji} Relevance: ${scorePercent}% (${scored.category})\n\n`;
    explanation += 'Reasoning:\n';
    explanation += scored.reasoning.map(r => `  • ${r}`).join('\n');

    return explanation;
  }
}

export default RelevanceScorer;
