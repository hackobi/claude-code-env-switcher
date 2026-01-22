import { spawn, execSync } from 'child_process';
import * as fs from 'fs';

/**
 * Image Prompt Extractor
 *
 * Uses Claude to analyze tweet/post content and extract a visually-descriptive
 * prompt suitable for image generation. This bridges the gap between text content
 * and visual representation.
 */

/**
 * Build a varied extraction prompt using randomized examples and metaphor suggestions
 * This prevents repetitive image outputs by varying the creative direction
 */
function buildExtractionPrompt(): string {
  // Randomized metaphor categories to suggest
  const metaphorSets = [
    // Set 1: Natural phenomena
    `- Natural phenomena (constellations, auroras, fractals, crystals, rivers, storms)
- Celestial bodies (moons, planets, nebulae, solar flares, eclipses)
- Organic growth (roots, vines, coral, mycelium networks, tree canopies)`,
    // Set 2: Architectural
    `- Architectural structures (bridges, towers, pathways, gates, aqueducts)
- Ancient monuments (pyramids, temples, standing stones, observatories)
- Modern architecture (skyscrapers, suspension bridges, geodesic domes)`,
    // Set 3: Abstract/geometric
    `- Abstract geometry (spirals, tessellations, portals, dimensions, vortexes)
- Mathematical forms (fractals, golden spirals, Penrose tiles, hypercubes)
- Optical phenomena (prisms, reflections, refractions, mirages)`,
    // Set 4: Energy/light
    `- Light and energy (beams, pulses, waves, refractions, plasma)
- Electrical phenomena (lightning, static, arcs, aurora borealis)
- Fire and heat (embers, flames, lava flows, forge sparks)`,
    // Set 5: Symbolic objects
    `- Symbolic objects (keys, shields, compasses, prisms, hourglasses)
- Navigation tools (astrolabes, sextants, maps, star charts)
- Transformation symbols (chrysalis, phoenix, seed pods, cocoons)`,
  ];

  // Randomized example sets to show different visual directions
  const exampleSets = [
    // Set A
    `Input: "Cross-chain identity is the foundation of Web3."
Output: A lighthouse beam cutting through fog to illuminate distant shores

Input: "Why 10 wallets for 10 chains?"
Output: Shattered mirror fragments each reflecting a different landscape`,
    // Set B
    `Input: "One identity across every blockchain"
Output: Rivers from mountain peaks all flowing into one luminous ocean

Input: "Fragmented wallets are holding Web3 back"
Output: A cracked geode with light emerging from the fractures`,
    // Set C
    `Input: "Unified identity changes everything"
Output: A compass rose with beams extending to every cardinal direction

Input: "The wallet problem in crypto"
Output: Scattered puzzle pieces hovering in darkness seeking their match`,
    // Set D
    `Input: "Cross-chain bridges for everyone"
Output: An aurora borealis forming an arch between two mountain peaks

Input: "Too many wallets, too much friction"
Output: Ancient keys being melted in a forge to form a single master key`,
    // Set E
    `Input: "Demos connects all chains"
Output: Tree roots from separate islands intertwining beneath the surface

Input: "Identity fragmentation is the real problem"
Output: A prism splitting white light into colors that reunite beyond it`,
  ];

  // Pick random sets for variety
  const metaphors = metaphorSets[Math.floor(Math.random() * metaphorSets.length)];
  const examples = exampleSets[Math.floor(Math.random() * exampleSets.length)];

  return `You are a visual concept extractor. Given a tweet about Web3/crypto, output a SHORT visual subject description.

CONTEXT: Demos is a cross-chain Web3 platform focused on unified identity and interoperability.

BE HIGHLY CREATIVE WITH VISUAL METAPHORS. Consider:
${metaphors}

CONCEPT → VISUAL TRANSLATION (be creative, vary your choices):
- "cross-chain" → bridges, woven threads, merging rivers, connected islands
- "fragmentation" → shattered glass, scattered keys, separated continents, split prism
- "identity" → compass, fingerprint, lighthouse, constellation portrait
- "unified" → confluence, fusion, convergence, singularity
- "wallet" → vault, keyring, treasure chest, secure container
- "interoperability" → puzzle pieces, DNA helix, symphony orchestra, woven fabric

RULES:
- Output ONLY the visual subject (5-15 words)
- Focus on WHAT to show, not HOW it looks
- No colors, no style directions, no aesthetic words
- Describe only physical objects, natural phenomena, or abstract shapes
- No typography, labels, UI elements, or readable content
- BE CREATIVE - avoid generic "glowing nodes" or "network connections"
- Each output should be UNIQUE and evocative

EXAMPLES:
${examples}

Extract a CREATIVE, UNIQUE visual subject from this text:`;
}

// Note: buildExtractionPrompt() is called fresh each time in extractVisualPrompt() for variety

/**
 * Find the Claude CLI executable
 */
function findClaudeCLI(): string | null {
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
async function executeClaudeCLI(prompt: string, timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const claudePath = findClaudeCLI();

    if (!claudePath) {
      reject(new Error('Claude CLI not found'));
      return;
    }

    const args = [
      '--print',
      '--model', 'opus',  // Use Opus for creative, varied visual extraction
      '--max-turns', '1',
      '--tools', '',
      '--setting-sources', '',
      '--mcp-config', '{"mcpServers":{}}',
      '-p', prompt,
    ];

    const childProcess = spawn(claudePath, args, {
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
 * Extract a visual prompt from tweet/post content
 *
 * @param tweetContent - The text content of the tweet or post
 * @returns A visually-descriptive prompt suitable for image generation
 */
export async function extractVisualPrompt(tweetContent: string): Promise<string> {
  // Clean up the content
  const cleanContent = tweetContent
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/\n+/g, ' ')           // Normalize newlines
    .trim()
    .slice(0, 500);                 // Limit length

  if (!cleanContent) {
    return 'Interconnected network nodes with flowing data streams';
  }

  try {
    const fullPrompt = `${buildExtractionPrompt()}\n\n"${cleanContent}"`;
    const visualDescription = await executeClaudeCLI(fullPrompt);

    // Validate the response
    if (visualDescription &&
        visualDescription.length > 10 &&
        visualDescription.length < 500 &&
        !visualDescription.toLowerCase().includes('sorry') &&
        !visualDescription.toLowerCase().includes('cannot')) {
      return visualDescription;
    }

    // Fallback if extraction failed
    return generateFallbackPrompt(cleanContent);
  } catch (error) {
    console.warn('Visual prompt extraction failed, using fallback:', error);
    return generateFallbackPrompt(cleanContent);
  }
}

/**
 * Visual theme categories - each has distinct visual language
 */
export type VisualCategory =
  | 'identity'      // CCI, wallets, unified identity
  | 'infrastructure'// Cross-chain, bridges, interop
  | 'developer'     // SDK, DX, building
  | 'ai-agents'     // Autonomous agents, AI
  | 'announcement'  // Shipped, launch, milestone
  | 'security'      // Privacy, encryption, protection
  | 'speed'         // Performance, fast, efficient
  | 'future'        // Vision, roadmap, tomorrow
  | 'general';      // Default fallback

/**
 * Detect the visual category from content
 */
export function detectVisualCategory(content: string): VisualCategory {
  const text = content.toLowerCase();

  // Priority order matters - more specific first
  if (text.match(/\b(ai agent|agentic|autonomous agent|agent identity)\b/)) return 'ai-agents';
  if (text.match(/\b(shipped|launch|live|released|milestone|announcing)\b/)) return 'announcement';
  if (text.match(/\b(security|secure|privacy|encrypt|protect|fortress)\b/)) return 'security';
  if (text.match(/\b(fast|speed|instant|performance|efficient|millisecond)\b/)) return 'speed';
  if (text.match(/\b(developer|sdk|devx|build|api|code|engineer)\b/)) return 'developer';
  if (text.match(/\b(identity|cci|wallet|unified|one wallet|fragmented)\b/)) return 'identity';
  if (text.match(/\b(cross-chain|multi-chain|bridge|interop|connect)\b/)) return 'infrastructure';
  if (text.match(/\b(future|vision|tomorrow|roadmap|coming soon)\b/)) return 'future';

  return 'general';
}

/**
 * Category-specific visual themes with varied metaphors
 */
const CATEGORY_VISUALS: Record<VisualCategory, string[]> = {
  'identity': [
    'A compass rose emanating beams of light in all directions',
    'Fingerprint pattern made of glowing constellation points',
    'A lighthouse beam cutting through dense fog',
    'Ancient key transforming into streams of light',
    'Mirror fragments reflecting the same face from different angles',
    'Shattered glass reforming into a perfect sphere',
    'Scattered puzzle pieces magnetically drawing together',
    'A cracked geode revealing crystalline light within',
    'Multiple shadows converging into a single silhouette',
    'Chains breaking apart and reforming as a single golden thread',
    'Scattered keys melting and flowing into one master key',
    'Separated continents drifting back together',
    'A prism reuniting split light into white brilliance',
    'Fractured ice reforming into a flawless crystal',
    'Dispersed embers coalescing into a focused flame',
  ],
  'infrastructure': [
    'Crystal bridges spanning between floating islands',
    'Light beams refracting through a geometric prism',
    'Rivers from different sources merging into one ocean',
    'Aurora arch spanning across a vast canyon',
    'Roots from separate trees intertwining underground',
    'Suspension bridge cables weaving between mountain peaks',
    'Aqueduct carrying light instead of water',
    'DNA helix made of intertwining light streams',
    'Woven fabric where each thread is a different color',
    'Neural pathways connecting distant brain regions',
  ],
  'developer': [
    'Architect compass drawing blueprints that spring to life',
    'Seeds growing into crystalline geometric structures',
    'Hands assembling glowing building blocks',
    'Blueprint lines transforming into three-dimensional forms',
    'Tools arranged in perfect harmony on a workbench',
    'Lego-like blocks assembling themselves mid-air',
    'A forge with molten code being shaped',
    'Scaffolding around a structure made of light',
    'Circuit paths forming on a blank substrate',
    'Gears and mechanisms assembling autonomously',
  ],
  'ai-agents': [
    'Fireflies dancing in coordinated formation',
    'Chess pieces moving autonomously across a board',
    'Constellation of stars pulsing in synchronized rhythm',
    'Origami birds folding themselves mid-flight',
    'Mechanical bees building a geometric hive',
    'Swarm of drones forming a larger shape',
    'Marionette with severed strings still dancing',
    'School of fish moving as one organism',
    'Robotic arms collaborating on a sculpture',
    'Musical notes arranging themselves into harmony',
  ],
  'announcement': [
    'Sunrise breaking over a geometric horizon',
    'Door of light opening to reveal a new landscape',
    'Rocket trail arcing across a starfield',
    'Firework burst frozen at peak bloom',
    'Flag being planted on a mountain summit',
    'Champagne bubble frozen at the moment of pop',
    'Curtain parting to reveal a stage of light',
    'Seal being broken on an ancient scroll',
    'Ribbon being cut with scissors of light',
    'Confetti suspended in a moment of celebration',
  ],
  'security': [
    'Fortress of crystalline light',
    'Shield reflecting incoming energy beams',
    'Vault door with intricate glowing mechanisms',
    'Protective dome of interlocking hexagons',
    'Guardian statue with eyes of pure light',
    'Moat of fire surrounding a serene castle',
    'Impenetrable wall of woven light threads',
    'Lock mechanism with countless intricate gears',
    'Sentinel towers watching over peaceful lands',
    'Cocoon of protective energy surrounding a core',
  ],
  'speed': [
    'Comet streaking through a field of stars',
    'Lightning bolt captured inside a crystal',
    'Cheetah made of flowing light particles',
    'Arrow in flight leaving a trail of sparks',
    'Shockwave rippling through space',
    'Bullet frozen mid-flight through water',
    'Hummingbird wings caught in blur of motion',
    'Sonic boom visualized as concentric rings',
    'Hyperspace tunnel stretching to infinity',
    'Meteor shower raining across the sky',
  ],
  'future': [
    'Portal opening to reveal a new dimension',
    'Geometric sun rising over abstract landscape',
    'Seed pod opening to release points of light',
    'Path of stepping stones leading to the horizon',
    'Telescope pointed at an undiscovered constellation',
    'Hourglass with sand flowing upward',
    'Cocoon cracking to reveal wings of light',
    'Seedling breaking through concrete',
    'Map being drawn by an invisible hand',
    'Compass needle spinning before settling on a new direction',
  ],
  'general': [
    'Abstract geometric shapes floating in harmony',
    'Waves of energy rippling through space',
    'Crystalline structure catching and refracting light',
    'Flowing ribbons of light interweaving',
    'Constellation pattern forming and reforming',
    'Kaleidoscope of shifting geometric patterns',
    'Sand dunes sculpted by invisible wind',
    'Northern lights dancing across the sky',
    'Soap bubbles with iridescent surfaces',
    'Smoke trails forming ephemeral sculptures',
  ],
};

/**
 * Generate a fallback prompt based on detected category
 * Returns varied visual subjects based on content theme
 */
function generateFallbackPrompt(content: string): string {
  const category = detectVisualCategory(content);
  const visuals = CATEGORY_VISUALS[category];

  // Pick a random visual from the category for variety
  const randomIndex = Math.floor(Math.random() * visuals.length);
  return visuals[randomIndex];
}

/**
 * Tagline Extraction Prompt
 * Creates punchy, memorable taglines for image overlays
 */
const TAGLINE_PROMPT = `You are a tagline writer for Demos, a Web3 cross-chain identity platform. Create a SHORT, PUNCHY tagline from the given tweet.

RULES:
- Output ONLY the tagline (3-8 words max)
- Make it memorable and impactful
- Use active voice, present tense
- No hashtags, no emojis, no URLs
- Can be a statement, question, or call-to-action
- Should work as an image overlay headline

STYLE OPTIONS:
- Bold statement: "One Identity. Every Chain."
- Provocative question: "Why 10 wallets for 10 chains?"
- Action-oriented: "Bridge the gap. Own your identity."
- Tech-forward: "Cross-chain. Unified. Yours."
- Problem/Solution: "Fragmented no more."

EXAMPLES:

Input: "Cross-chain identity is the foundation of Web3. One wallet, every blockchain."
Output: One Identity. Every Chain.

Input: "Why does using 10 different wallets for 10 different chains feel like the dark ages?"
Output: The Dark Ages of Wallets End Here

Input: "Shipped: Solana wallet integration now live in Demos CCI"
Output: Solana Just Joined the Party

Input: "Developer experience matters - building for builders"
Output: Built for Builders

Input: "The future of Web3 is unified identity across all chains"
Output: Your Identity. Everywhere.

Extract a tagline from this text:`;

/**
 * Extract a compelling tagline from tweet content using Claude Opus
 * Falls back to simple extraction if AI fails
 */
export async function extractTagline(tweetContent: string): Promise<string> {
  // Clean up the content
  const cleanContent = tweetContent
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/\n+/g, ' ')           // Normalize newlines
    .trim()
    .slice(0, 500);                 // Limit length

  if (!cleanContent) {
    return 'Demos Network';
  }

  try {
    const fullPrompt = `${TAGLINE_PROMPT}\n\n"${cleanContent}"`;
    const tagline = await executeClaudeCLI(fullPrompt);

    // Validate the response
    if (tagline &&
        tagline.length >= 3 &&
        tagline.length <= 60 &&
        !tagline.toLowerCase().includes('sorry') &&
        !tagline.toLowerCase().includes('cannot') &&
        !tagline.includes('http')) {
      // Clean up any quotes that might be in the response
      return tagline.replace(/^["']|["']$/g, '').trim();
    }

    // Fallback if extraction failed validation
    return generateFallbackTagline(cleanContent);
  } catch (error) {
    console.warn('Tagline extraction failed, using fallback:', error);
    return generateFallbackTagline(cleanContent);
  }
}

/**
 * Generate a simple fallback tagline from content
 */
function generateFallbackTagline(content: string): string {
  // Try to get first sentence
  const sentenceMatch = content.match(/^[^.!?]+[.!?]?/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim();
    if (sentence.length <= 40) return sentence;
    // Truncate at word boundary
    return sentence.slice(0, 37).replace(/\s+\S*$/, '') + '...';
  }

  // Fallback to first 40 chars
  if (content.length <= 40) return content;
  return content.slice(0, 37).replace(/\s+\S*$/, '') + '...';
}

export default extractVisualPrompt;
