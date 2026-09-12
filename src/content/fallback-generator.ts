import { GenerationContext, GeneratedContent } from './ai-generator';

/**
 * Fallback Content Generator
 * 
 * Simple content generator that works without external API calls
 * for demonstration purposes when Claude CLI credits are insufficient
 */
export class FallbackContentGenerator {
  
  async generate(context: GenerationContext): Promise<GeneratedContent | null> {
    console.log('🔄 Using fallback content generator (no external API)');
    console.log('🔄 FALLBACK GENERATOR CALLED - generating content from templates');
    
    try {
      // Extract key information from the source
      let sourceText = '';
      if (typeof context.trigger?.content === 'string') {
        sourceText = context.trigger.content;
      } else if (context.trigger?.content?.text) {
        sourceText = context.trigger.content.text;
      } else if (context.source?.text) {
        sourceText = context.source.text;
      }
      
      console.log('🔄 Source text extracted:', sourceText.substring(0, 100) + '...');
      console.log('🔄 Context structure:', JSON.stringify(context, null, 2).substring(0, 500) + '...');
      const topics = this.extractTopics(sourceText);
      const sentiment = this.analyzeSentiment(sourceText);
      
      // Generate content based on templates and context
      const content = this.generateFromTemplate(topics, sentiment, context);
      
      return {
        content,
        type: 'tweet' as const,
        reasoning: `Fallback template (topics: ${topics.join(', ')}, sentiment: ${sentiment})`,
        relevanceScore: 0.5,
        tags: topics.map(t => `#${t}`),
      };
      
    } catch (error) {
      console.error('Fallback generation failed:', error);
      return null;
    }
  }
  
  private extractTopics(text: string): string[] {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    // Detect common Web3/blockchain topics
    if (lowerText.includes('cross-chain') || lowerText.includes('multichain')) {
      topics.push('cross-chain');
    }
    if (lowerText.includes('wallet') || lowerText.includes('address')) {
      topics.push('wallet-management');
    }
    if (lowerText.includes('identity') || lowerText.includes('did')) {
      topics.push('digital-identity');
    }
    if (lowerText.includes('defi') || lowerText.includes('yield')) {
      topics.push('defi');
    }
    if (lowerText.includes('gas') || lowerText.includes('fee')) {
      topics.push('transaction-costs');
    }
    if (lowerText.includes('interoperability') || lowerText.includes('bridge')) {
      topics.push('interoperability');
    }
    
    return topics.length > 0 ? topics : ['blockchain-general'];
  }
  
  private analyzeSentiment(text: string): 'frustrated' | 'excited' | 'neutral' | 'concerned' {
    const lowerText = text.toLowerCase();
    
    // Simple keyword-based sentiment analysis
    const frustratedWords = ['problem', 'issue', 'broken', 'sucks', 'hate', 'terrible'];
    const excitedWords = ['amazing', 'great', 'love', 'awesome', 'fantastic', 'incredible'];
    const concernedWords = ['worried', 'concerned', 'unsure', 'risky', 'dangerous'];
    
    const frustratedCount = frustratedWords.filter(word => lowerText.includes(word)).length;
    const excitedCount = excitedWords.filter(word => lowerText.includes(word)).length;
    const concernedCount = concernedWords.filter(word => lowerText.includes(word)).length;
    
    if (frustratedCount > excitedCount && frustratedCount > concernedCount) return 'frustrated';
    if (excitedCount > frustratedCount && excitedCount > concernedCount) return 'excited';
    if (concernedCount > 0) return 'concerned';
    
    return 'neutral';
  }
  
  private generateFromTemplate(topics: string[], sentiment: string, context: GenerationContext): string {
    const templates = {
      'cross-chain': [
        "Cross-chain complexity is real. Demos CCI gives you one identity across all chains - no more managing separate addresses for each network.",
        "The multi-wallet problem affects everyone in Web3. With Demos Cross-Context Identity, your identity works seamlessly across 10+ chains.",
        "Cross-chain transactions shouldn't require a PhD. Demos simplifies this with unified identity that just works."
      ],
      'wallet-management': [
        "Managing wallets across chains is painful. Demos CCI solves this by giving you one identity that works everywhere.",
        "The wallet fragmentation problem is worse than people think. Demos Network's approach: one identity, all chains.",
        "Different address for every chain = user friction. Demos CCI creates unified identity across the entire Web3 ecosystem."
      ],
      'digital-identity': [
        "Digital identity in Web3 is fragmented by design. Demos CCI creates a unified identity layer that actually works across chains.",
        "True cross-chain identity isn't just convenient - it's necessary for Web3 adoption. Here's how Demos is building it:",
        "Self-sovereign identity needs to work across all chains, not just one. Demos CCI makes this reality."
      ],
      'defi': [
        "DeFi complexity comes from fragmented identity. Imagine using the same identity across all DeFi protocols, all chains.",
        "Yield farming across chains requires multiple wallets and addresses. Demos CCI eliminates this friction entirely.",
        "DeFi adoption is limited by cross-chain complexity. Demos Network's unified identity removes these barriers."
      ],
      'transaction-costs': [
        "Gas fees are just one part of Web3 friction. Identity fragmentation is another. Demos CCI solves the identity piece.",
        "High transaction costs + wallet management overhead = Web3 UX problem. Demos focuses on solving the identity layer.",
        "Beyond gas optimization, we need identity optimization. Demos CCI reduces the cognitive overhead of cross-chain interactions."
      ],
      'interoperability': [
        "True interoperability requires more than bridges - it requires unified identity. That's what Demos CCI provides.",
        "Bridges move assets, but Demos moves identity. Cross-Context Identity works across 10+ chains without compromises.",
        "Interoperability isn't just about moving tokens. It's about maintaining consistent identity across ecosystems."
      ],
      'blockchain-general': [
        "Web3's biggest UX problem isn't gas fees - it's identity fragmentation. Demos CCI solves this fundamental issue.",
        "Every chain has different addresses, different wallets, different identity systems. Demos unifies this experience.",
        "The promise of decentralized identity is broken by chain fragmentation. Demos CCI delivers on the original vision."
      ]
    };
    
    // Select appropriate template based on primary topic
    const primaryTopic = topics[0] || 'blockchain-general';
    const topicTemplates = templates[primaryTopic] || templates['blockchain-general'];
    
    // Choose template based on sentiment
    let templateIndex = 0;
    if (sentiment === 'frustrated') templateIndex = 0; // Problem-focused
    if (sentiment === 'excited') templateIndex = 1;    // Solution-focused
    if (sentiment === 'concerned') templateIndex = 0;  // Problem-focused
    if (sentiment === 'neutral') templateIndex = 2;    // Educational
    
    // Ensure we don't go out of bounds
    templateIndex = Math.min(templateIndex, topicTemplates.length - 1);
    
    return topicTemplates[templateIndex];
  }
}

export default FallbackContentGenerator;