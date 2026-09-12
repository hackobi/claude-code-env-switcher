import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { applyLogoOverlay } from '../../lib/image-overlay';
import { extractVisualPrompt, extractTagline, detectVisualCategory, VisualCategory } from '../../lib/image-prompt-extractor';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');
const VISUAL_PROFILE_PATH = path.join(process.cwd(), '..', 'data', 'visual-style-profile.json');
const ENV_PATH = path.join(process.cwd(), '..', '.env');

interface VisualStyleProfile {
  colorPalette: {
    primary: string[];
    backgrounds: string[];
  };
  styleCharacteristics: {
    composition: string[];
    themes: string[];
    mood: string[];
  };
  avoidedPatterns: string[];
}

async function loadEnv(): Promise<Record<string, string>> {
  try {
    const envContent = await fs.readFile(ENV_PATH, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    }
    return env;
  } catch {
    return {};
  }
}

async function loadVisualProfile(): Promise<VisualStyleProfile | null> {
  try {
    const data = await fs.readFile(VISUAL_PROFILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function updateImageInDatabase(id: string, imageUrl: string, baseImageUrl?: string): boolean {
  try {
    const db = new Database(DB_PATH);
    if (baseImageUrl) {
      // Store both the final image and the base image (without overlay)
      const stmt = db.prepare('UPDATE generated_content SET image_path = ?, base_image_path = ? WHERE id = ?');
      const result = stmt.run(imageUrl, baseImageUrl, parseInt(id));
      db.close();
      return result.changes > 0;
    } else {
      // Just update the final image
      const stmt = db.prepare('UPDATE generated_content SET image_path = ? WHERE id = ?');
      const result = stmt.run(imageUrl, parseInt(id));
      db.close();
      return result.changes > 0;
    }
  } catch (error) {
    console.error('Failed to update image in database:', error);
    return false;
  }
}

/**
 * Category-specific visual styles - each has a distinct mood and color emphasis
 */
const CATEGORY_STYLES: Record<VisualCategory, { mood: string; colorEmphasis: string; elements: string }> = {
  'identity': {
    mood: 'Centered, harmonious, unified',
    colorEmphasis: 'Dominant Palatinate Blue (#2B36D9) with warm Solar Flame Orange (#CA2800) accents',
    elements: 'Radial patterns, central focal points, converging lines',
  },
  'infrastructure': {
    mood: 'Connected, flowing, bridging',
    colorEmphasis: 'Cyan Sky Blue (#00DAFF) with Palatinate Blue (#2B36D9) anchors',
    elements: 'Horizontal bridges, flowing streams, connecting arches',
  },
  'developer': {
    mood: 'Constructive, precise, building',
    colorEmphasis: 'Cool Palatinate Blue (#2B36D9) with subtle Cyan (#00DAFF) highlights',
    elements: 'Geometric shapes, blueprint-like lines, structured grids',
  },
  'ai-agents': {
    mood: 'Autonomous, dynamic, coordinated',
    colorEmphasis: 'Vibrant Fuchsia Magenta (#FF35F9) with Cyan (#00DAFF) trails',
    elements: 'Multiple independent points moving in formation, particle swarms',
  },
  'announcement': {
    mood: 'Celebratory, energetic, breakthrough',
    colorEmphasis: 'Bold Solar Flame Orange (#CA2800) with Magenta (#FF35F9) bursts',
    elements: 'Explosive patterns, radiating lines, breakthrough moments',
  },
  'security': {
    mood: 'Protected, solid, impenetrable',
    colorEmphasis: 'Deep Palatinate Blue (#2B36D9) with crystalline Cyan (#00DAFF)',
    elements: 'Shield shapes, hexagonal patterns, fortress structures',
  },
  'speed': {
    mood: 'Swift, dynamic, powerful',
    colorEmphasis: 'Streaking Cyan (#00DAFF) with Solar Flame Orange (#CA2800) trails',
    elements: 'Motion blur, trailing lines, velocity streaks',
  },
  'future': {
    mood: 'Expansive, visionary, promising',
    colorEmphasis: 'Ethereal blend of all brand colors with dominant blue horizon',
    elements: 'Horizon lines, portals, expanding geometries',
  },
  'general': {
    mood: 'Modern, tech-forward, abstract',
    colorEmphasis: 'Balanced Palatinate Blue (#2B36D9) with Cyan (#00DAFF) and Magenta (#FF35F9)',
    elements: 'Flowing particles, abstract geometries, light trails',
  },
};

function buildEnhancedPrompt(basePrompt: string, category: VisualCategory, profile: VisualStyleProfile | null): string {
  // ═══════════════════════════════════════════════════════════════════════════
  // DEMOS OFFICIAL BRAND COLOR PALETTE
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // PRIMARY COLORS:
  //   Palatinate Blue   #2B36D9  RGB(43, 54, 217)   - Main brand blue
  //   Solar Flame Orange #CA2800  RGB(202, 40, 0)   - Energy, warmth accents
  //
  // SECONDARY COLORS (Marketing/GFX):
  //   Fuchsia Magenta   #FF35F9  RGB(255, 53, 249)  - Vibrant accent
  //   Cyan Sky Blue     #00DAFF  RGB(0, 218, 255)   - Tech/data accent
  //
  // ═══════════════════════════════════════════════════════════════════════════

  const style = CATEGORY_STYLES[category];

  return `Dark cyberpunk digital art. Deep black background.

SUBJECT: ${basePrompt}

MOOD: ${style.mood}

COLOR PALETTE: ${style.colorEmphasis}
Base colors always include: Palatinate Blue (#2B36D9), Cyan Sky Blue (#00DAFF), Fuchsia Magenta (#FF35F9), Solar Flame Orange (#CA2800).

VISUAL ELEMENTS: ${style.elements}
Glowing light trails, bioluminescent glow, mysterious atmosphere.

COMPOSITION (CRITICAL):
- Place the main subject in the upper half or center of the image
- Keep the BOTTOM 25% relatively clear/dark for text overlay
- Leave the TOP LEFT corner clear for logo placement
- Avoid bright elements or high-contrast details in the bottom strip
- Use fading gradients or negative space in overlay areas

STYLE: High contrast, cinematic lighting, professional social media finish.

CRITICAL REQUIREMENTS (MUST FOLLOW):
- Pure abstract visual art only - NO EXCEPTIONS
- ABSOLUTELY NO TEXT of any kind: no words, letters, numbers, symbols, logos, watermarks, signatures, labels, captions, titles, or any readable content
- Do NOT write "logo", "LOGO", "brand", "text", or ANY word in the image
- Do NOT include any UI elements, buttons, badges, or interface components
- No human faces, hands, or body parts
- No brand names, company names, or product names
- The image must be 100% text-free - if you're tempted to add any text, DON'T
- Focus ONLY on abstract shapes, colors, light effects, and geometric composition
- When in doubt, use more abstract glowing particles instead of any representational elements.`.trim();
}

async function generateWithImagen(apiKey: string, prompt: string): Promise<string> {
  // Google Imagen 4 via Gemini API
  // Using 16:9 aspect ratio for Twitter optimal display (1200x675)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9', // Twitter optimal aspect ratio
          personGeneration: 'dont_allow',
          safetyFilterLevel: 'block_only_high',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Imagen API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log('[Imagen] Response structure:', JSON.stringify(result).slice(0, 200));

  // Imagen returns base64 encoded images
  if (result.predictions?.[0]?.bytesBase64Encoded) {
    // Return as data URL for immediate display
    return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
  }

  // Check for content filtering or other issues
  if (result.predictions?.[0]?.raiFilteredReason) {
    throw new Error(`Image blocked by safety filter: ${result.predictions[0].raiFilteredReason}`);
  }

  throw new Error(`No image data in Imagen response: ${JSON.stringify(result).slice(0, 300)}`);
}

async function generateWithDALLE(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.data[0].url;
}

export async function POST(request: Request) {
  try {
    const { id, prompt, applyOverlay = true, tagline: customTagline, skipExtraction = false } = await request.json();

    // Load environment variables
    const env = await loadEnv();
    // Accept either GOOGLE_AI_API_KEY or GOOGLE_API_KEY for flexibility
    const googleApiKey = env.GOOGLE_AI_API_KEY || env.GOOGLE_API_KEY;
    const openaiApiKey = env.OPENAI_API_KEY;

    // Check for at least one API key
    const hasGoogle = googleApiKey && googleApiKey !== 'your_google_ai_api_key';
    const hasOpenAI = openaiApiKey && openaiApiKey !== 'your_openai_api_key';

    if (!hasGoogle && !hasOpenAI) {
      return NextResponse.json(
        { error: 'No image API configured. Add GOOGLE_API_KEY or OPENAI_API_KEY to demos-marketing-intelligence/.env' },
        { status: 400 }
      );
    }

    // Load visual profile for brand-consistent styling
    const visualProfile = await loadVisualProfile();

    // Step 1: Detect content category for visual theming
    const category = detectVisualCategory(prompt);
    console.log('[ImageGen] Detected category:', category);

    // Step 2: Extract visual concept from tweet content using Claude
    // This translates abstract text into concrete visual subjects
    let visualPrompt = prompt;
    if (!skipExtraction) {
      try {
        console.log('[ImageGen] Extracting visual concept from:', prompt.slice(0, 100) + '...');
        visualPrompt = await extractVisualPrompt(prompt);
        console.log('[ImageGen] Extracted visual prompt:', visualPrompt);
      } catch (extractionError) {
        console.warn('[ImageGen] Visual extraction failed, using raw prompt:', extractionError);
        // Fall back to raw prompt if extraction fails
      }
    }

    // Step 3: Build enhanced prompt with Demos branding and category-specific styling
    const enhancedPrompt = buildEnhancedPrompt(visualPrompt, category, visualProfile);
    console.log('[ImageGen] Final enhanced prompt length:', enhancedPrompt.length, '| Category:', category);

    let imageUrl: string;
    let baseImageUrl: string; // Store the raw generated image (without overlay)
    let cost: string;
    let generator: string;

    // Try Imagen 4 first (primary), fall back to DALL-E 3
    if (hasGoogle) {
      try {
        imageUrl = await generateWithImagen(googleApiKey, enhancedPrompt);
        cost = '$0.02';
        generator = 'Google Imagen 4';
      } catch (imagenError) {
        console.warn('Imagen failed, trying DALL-E fallback:', imagenError);
        if (hasOpenAI) {
          imageUrl = await generateWithDALLE(openaiApiKey, enhancedPrompt);
          cost = '$0.04';
          generator = 'DALL-E 3 (fallback)';
        } else {
          throw imagenError;
        }
      }
    } else {
      // Only DALL-E available
      imageUrl = await generateWithDALLE(openaiApiKey, enhancedPrompt);
      cost = '$0.04';
      generator = 'DALL-E 3';
    }

    // Store the base image (without overlay) for later tagline edits
    baseImageUrl = imageUrl;

    // Apply Demos logo overlay (logo top-left, tagline centered bottom)
    if (applyOverlay) {
      try {
        // Use custom tagline, or extract compelling tagline using Claude Opus
        let tagline = customTagline;
        if (!tagline) {
          console.log('[ImageGen] Extracting tagline using Claude Opus...');
          tagline = await extractTagline(prompt);
          console.log('[ImageGen] Extracted tagline:', tagline);
        }

        // Uses new defaults: 22% logo, 48px padding, centered Source Code Pro text
        imageUrl = await applyLogoOverlay(imageUrl, { tagline });
        console.log('[ImageGen] Applied Demos overlay with tagline:', tagline);
      } catch (overlayError) {
        console.warn('[ImageGen] Overlay failed, using original image:', overlayError);
        // Continue with original image if overlay fails
      }
    }

    // If content ID provided, update the database (storing both final and base images)
    if (id) {
      const updated = updateImageInDatabase(id, imageUrl, baseImageUrl);
      if (updated) {
        console.log(`Updated image for content ID ${id} (with base image stored)`);
      } else {
        console.warn(`Could not update image for content ID ${id} - item not found`);
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      baseImageUrl, // Return base image URL for client reference
      cost,
      generator,
      category, // Visual category detected from content
      visualPrompt: visualPrompt !== prompt ? visualPrompt : undefined, // Include if extraction was used
    });
  } catch (error) {
    console.error('Failed to generate image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
