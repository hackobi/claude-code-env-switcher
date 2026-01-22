/**
 * Demos Content Sources
 *
 * Loads and provides context from official Demos content:
 * - Yellow Paper (YP) - Technical documentation
 * - Paragraph articles - Blog posts and announcements
 * - Sales deck - Value propositions and messaging
 *
 * This content is used to:
 * 1. Provide accurate technical context for AI-generated content
 * 2. Ensure messaging consistency with official materials
 * 3. Extract key talking points and value props
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface ContentSource {
  type: 'yellow_paper' | 'paragraph' | 'sales_deck' | 'documentation';
  title: string;
  content: string;
  url?: string;
  lastUpdated?: string;
  keyPoints?: string[];
}

export interface DemosContext {
  valueProp: string;
  keyFeatures: string[];
  technicalCapabilities: string[];
  useCases: string[];
  differentiators: string[];
  recentAnnouncements: string[];
}

// Path to content sources directory
const CONTENT_DIR = path.join(process.cwd(), 'data', 'content-sources');

/**
 * Demos Yellow Paper key points
 * These are the core technical concepts that should be accurately represented
 */
export const YELLOW_PAPER_CONTEXT = {
  title: 'Demos Network Yellow Paper',
  coreComponents: [
    'Cross-Context Identity (CCI) - Universal identity across chains and Web2',
    'XM SDK - Unified interface for 10+ blockchains (EVM, Solana, MultiversX, TON, etc.)',
    'DemosWork - Multi-step scriptable workflows with conditionals',
    'DAHR - Web2 proxy for attested HTTP requests through the network',
    'L2PS - Private encrypted node shards (subnets)',
  ],
  technicalDetails: [
    'Account abstraction via CCI enables gas-free cross-chain transactions',
    'Identity aggregation links wallets, social accounts, and credentials',
    'Trustless bridging through cryptographic attestations',
    'Decentralized oracle network for Web2 data verification',
  ],
  keyDifferentiators: [
    'No wallet fragmentation - one identity across all chains',
    'Web2 + Web3 unified - bring traditional services on-chain',
    'Developer-first - simple SDK abstracts blockchain complexity',
    'Privacy-preserving - selective disclosure of identity attributes',
  ],
};

/**
 * Sales deck key messaging
 * Core value props and positioning for marketing content
 */
export const SALES_DECK_CONTEXT = {
  title: 'Demos Network Sales Deck',
  headline: 'The Identity Layer for the Multi-Chain Future',
  taglines: [
    'One identity. Every chain.',
    'Cross-chain without compromise.',
    'Where Web2 meets Web3.',
    'Build once, deploy everywhere.',
  ],
  valuePropositions: [
    {
      title: 'Unified Identity',
      description: 'Link wallets, social accounts, and credentials into one portable identity',
      benefit: 'Users never lose access, developers get complete user context',
    },
    {
      title: 'Chain Abstraction',
      description: 'Interact with any blockchain through a single interface',
      benefit: 'No chain-specific code, no wallet switching, no bridge complexity',
    },
    {
      title: 'Web2 Integration',
      description: 'Bring traditional APIs and services into your dApp',
      benefit: 'Verified data from any source with cryptographic attestations',
    },
    {
      title: 'Developer Experience',
      description: 'Simple SDK that handles the complexity',
      benefit: 'Ship faster, maintain less, scale effortlessly',
    },
  ],
  targetAudiences: [
    'DeFi protocols needing cross-chain liquidity',
    'Gaming studios building multi-chain experiences',
    'Identity platforms seeking interoperability',
    'Enterprises bridging Web2 and Web3',
  ],
  competitiveAdvantages: [
    'Only solution combining identity + chain abstraction + Web2 proxy',
    'Production-ready SDK with battle-tested infrastructure',
    'No vendor lock-in - open standards and protocols',
    'Active developer community and support',
  ],
};

/**
 * Recent Paragraph articles and announcements
 * Update this when new content is published
 */
export const PARAGRAPH_ARTICLES: ContentSource[] = [
  {
    type: 'paragraph',
    title: 'Introducing ERC-8004: Agent Identity Standard',
    content: `ERC-8004 establishes a standard for AI agent identities on-chain.
    Agents can be registered as NFTs with verifiable metadata, enabling:
    - Reputation tracking across interactions
    - Validation registries for quality assurance
    - Cross-chain agent identity portability
    Demos is the reference implementation for this standard.`,
    url: 'https://paragraph.xyz/@demos/erc-8004',
    keyPoints: [
      'AI agents as first-class on-chain citizens',
      'NFT-based identity with metadata',
      'Reputation and validation systems',
      'Cross-chain portability',
    ],
  },
  {
    type: 'paragraph',
    title: 'Chain Abstraction: The End of Wallet Fragmentation',
    content: `Users shouldn't need 10 wallets for 10 chains. Chain abstraction
    means one identity, one interface, access to everything. Demos makes this
    possible through Cross-Context Identity (CCI) and the XM SDK.`,
    url: 'https://paragraph.xyz/@demos/chain-abstraction',
    keyPoints: [
      'Single identity across all chains',
      'No more wallet switching',
      'Unified transaction signing',
      'Seamless cross-chain DeFi',
    ],
  },
  {
    type: 'paragraph',
    title: 'Building with DAHR: Web2 APIs in Web3',
    content: `DAHR (Decentralized Attested HTTP Requests) brings any Web2 API
    into your dApp with cryptographic proofs. Verify Twitter handles, fetch
    stock prices, or integrate with any external service - trustlessly.`,
    url: 'https://paragraph.xyz/@demos/dahr-web2-integration',
    keyPoints: [
      'Any API becomes an oracle',
      'Cryptographic attestations',
      'No centralized intermediary',
      'Flexible data verification',
    ],
  },
];

/**
 * Documentation highlights for technical accuracy
 */
export const DOCUMENTATION_CONTEXT = {
  sdkModules: [
    { name: 'websdk', purpose: 'Core node connection, auth, identity, transactions' },
    { name: 'xm-websdk', purpose: 'Cross-chain operations (EVM, Solana, MultiversX, etc.)' },
    { name: 'demoswork', purpose: 'Multi-step workflow engine with conditionals' },
    { name: 'bridge', purpose: 'Cross-chain swaps via Rubic integration' },
    { name: 'wallet', purpose: 'Wallet utilities and key management' },
    { name: 'encryption', purpose: 'Cryptographic utilities' },
    { name: 'l2ps', purpose: 'Subnet module for private networks' },
  ],
  supportedChains: [
    'Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon',
    'Solana', 'MultiversX', 'TON', 'NEAR', 'Aptos', 'XRPL', 'IBC chains',
  ],
  keyMethods: [
    { method: 'demos.connect()', purpose: 'Connect to Demos node' },
    { method: 'demos.connectWallet()', purpose: 'Authenticate with wallet' },
    { method: 'EVM.create()', purpose: 'Create cross-chain EVM instance' },
    { method: 'instance.preparePay()', purpose: 'Prepare cross-chain payment' },
    { method: 'dahr.startProxy()', purpose: 'Start Web2 API proxy' },
  ],
};

/**
 * Load all content sources and build unified context
 */
export async function loadDemosContext(): Promise<DemosContext> {
  // Try to load any custom content from files
  const customContent = await loadCustomContent();

  return {
    valueProp: SALES_DECK_CONTEXT.headline,
    keyFeatures: YELLOW_PAPER_CONTEXT.coreComponents,
    technicalCapabilities: YELLOW_PAPER_CONTEXT.technicalDetails,
    useCases: SALES_DECK_CONTEXT.targetAudiences,
    differentiators: [
      ...YELLOW_PAPER_CONTEXT.keyDifferentiators,
      ...SALES_DECK_CONTEXT.competitiveAdvantages.slice(0, 2),
    ],
    recentAnnouncements: PARAGRAPH_ARTICLES.map(a => a.title),
    ...customContent,
  };
}

/**
 * Load custom content from data directory if available
 */
async function loadCustomContent(): Promise<Partial<DemosContext>> {
  try {
    await fs.mkdir(CONTENT_DIR, { recursive: true });

    const files = await fs.readdir(CONTENT_DIR);
    const customContext: Partial<DemosContext> = {};

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(CONTENT_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        Object.assign(customContext, data);
      }
    }

    return customContext;
  } catch {
    return {};
  }
}

/**
 * Get relevant content for a specific topic
 */
export function getRelevantContent(topic: string): {
  yellowPaper: string[];
  salesPoints: string[];
  articles: ContentSource[];
} {
  const topicLower = topic.toLowerCase();

  // Find relevant yellow paper points
  const yellowPaper = [
    ...YELLOW_PAPER_CONTEXT.coreComponents,
    ...YELLOW_PAPER_CONTEXT.technicalDetails,
  ].filter(point => {
    const pointLower = point.toLowerCase();
    return topicLower.split(' ').some(word =>
      word.length > 3 && pointLower.includes(word)
    );
  });

  // Find relevant sales points
  const salesPoints = SALES_DECK_CONTEXT.valuePropositions
    .filter(vp => {
      const vpText = `${vp.title} ${vp.description} ${vp.benefit}`.toLowerCase();
      return topicLower.split(' ').some(word =>
        word.length > 3 && vpText.includes(word)
      );
    })
    .map(vp => `${vp.title}: ${vp.description}`);

  // Find relevant articles
  const articles = PARAGRAPH_ARTICLES.filter(article => {
    const articleText = `${article.title} ${article.content}`.toLowerCase();
    return topicLower.split(' ').some(word =>
      word.length > 3 && articleText.includes(word)
    );
  });

  return { yellowPaper, salesPoints, articles };
}

/**
 * Get a random tagline for content
 */
export function getRandomTagline(): string {
  const taglines = SALES_DECK_CONTEXT.taglines;
  return taglines[Math.floor(Math.random() * taglines.length)];
}

/**
 * Get technical accuracy context for a specific topic
 */
export function getTechnicalContext(topic: string): string[] {
  const topicLower = topic.toLowerCase();
  const context: string[] = [];

  // Check SDK modules
  for (const module of DOCUMENTATION_CONTEXT.sdkModules) {
    if (topicLower.includes(module.name) || topicLower.includes(module.purpose.toLowerCase())) {
      context.push(`SDK: ${module.name} - ${module.purpose}`);
    }
  }

  // Check supported chains
  for (const chain of DOCUMENTATION_CONTEXT.supportedChains) {
    if (topicLower.includes(chain.toLowerCase())) {
      context.push(`Supported chain: ${chain}`);
    }
  }

  // Check key methods
  for (const method of DOCUMENTATION_CONTEXT.keyMethods) {
    if (topicLower.includes(method.purpose.toLowerCase())) {
      context.push(`Method: ${method.method} - ${method.purpose}`);
    }
  }

  return context;
}

/**
 * Build AI context string for content generation
 */
export function buildContentGenerationContext(topic: string): string {
  const relevant = getRelevantContent(topic);
  const technical = getTechnicalContext(topic);

  const parts: string[] = [
    '=== DEMOS OFFICIAL CONTEXT ===',
    '',
    `Value Proposition: ${SALES_DECK_CONTEXT.headline}`,
    '',
  ];

  if (relevant.yellowPaper.length > 0) {
    parts.push('Technical Background:');
    relevant.yellowPaper.slice(0, 3).forEach(p => parts.push(`- ${p}`));
    parts.push('');
  }

  if (relevant.salesPoints.length > 0) {
    parts.push('Key Messaging:');
    relevant.salesPoints.slice(0, 2).forEach(p => parts.push(`- ${p}`));
    parts.push('');
  }

  if (relevant.articles.length > 0) {
    parts.push('Related Announcements:');
    relevant.articles.slice(0, 2).forEach(a => parts.push(`- ${a.title}`));
    parts.push('');
  }

  if (technical.length > 0) {
    parts.push('Technical Details:');
    technical.slice(0, 3).forEach(t => parts.push(`- ${t}`));
    parts.push('');
  }

  parts.push('Taglines (use sparingly):');
  SALES_DECK_CONTEXT.taglines.forEach(t => parts.push(`- "${t}"`));

  return parts.join('\n');
}

export default {
  YELLOW_PAPER_CONTEXT,
  SALES_DECK_CONTEXT,
  PARAGRAPH_ARTICLES,
  DOCUMENTATION_CONTEXT,
  loadDemosContext,
  getRelevantContent,
  getTechnicalContext,
  buildContentGenerationContext,
  getRandomTagline,
};
