import OpenAI from 'openai';

export interface ImageGenerationOptions {
  prompt: string;
  style?: 'vivid' | 'natural';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  generator?: 'imagen' | 'dalle'; // Primary generator preference
}

export interface VisualStyleProfile {
  lastUpdated: string;
  samplesAnalyzed: number;
  sources: {
    twitter: number;
    paragraph: number;
  };
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
  exampleImageUrls: string[];
}

// Demos brand colors
const DEMOS_COLORS = {
  palatinateBLue: '#2B36D9',
  solarFlame: '#FF4808',
  fuchsia: '#FF35F9',
  skyBlue: '#00DAFF',
  darkBackground: '#010109',
  lightBackground: '#FFFFFF',
};

export function buildDemosPrompt(
  basePrompt: string,
  visualProfile?: VisualStyleProfile
): string {
  // Demos brand aesthetic: Ancient Greek vaporwave
  const brandAesthetic = `
Ancient Greek vaporwave aesthetic for Demos Network.
High contrast black and white base with selective color pops in neon purple (#FF35F9), pink, and cyan (#00DAFF).
Classical Greek marble statue or architectural element as main subject, rendered in dramatic chiaroscuro lighting.
`.trim();

  // Visual elements
  const visualElements = `
Secondary elements: subtle synthwave grid pattern overlay, digital chains connecting elements, matrix code streaming in background.
Add pixelated 8-bit accents or borders for retro web nostalgia.
`.trim();

  // Style notes
  const styleNotes = `
Style: Clean, minimalist composition with strong focal point. Classical meets cyberpunk.
Marble texture contrasted with digital elements. High contrast shadows and highlights.
Selective use of bright neon colors against monochrome base.
Grid patterns should be subtle, not overwhelming. Include negative space for text placement.
`.trim();

  // Technical specs
  const technicalSpecs = `
Technical: High resolution, sharp details on main subject, soft digital elements in background.
Cinematic lighting. Classical Greek aesthetics merged with vaporwave synthwave elements.
Clean, professional finish suitable for social media content.
`.trim();

  // What to avoid
  const avoidPatterns = `
AVOID: Generic stock imagery, cartoon/illustrated style, cluttered compositions,
any text or words in image, realistic human figures or faces,
blockchain clichés like coins/chains/blocks, busy overwhelming backgrounds.
`.trim();

  // Combine into final prompt
  return `
${brandAesthetic}

Subject: ${basePrompt}

${visualElements}

${styleNotes}

${technicalSpecs}

${avoidPatterns}
`.trim();
}

async function generateWithImagen(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
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
  if (result.predictions?.[0]?.bytesBase64Encoded) {
    return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
  }
  throw new Error('No image data in Imagen response');
}

async function generateWithDALLE(
  apiKey: string,
  prompt: string,
  options: ImageGenerationOptions
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: options.size || '1024x1024',
    quality: options.quality || 'standard',
    style: options.style || 'vivid',
    n: 1,
  });

  const imageUrl = response.data[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL in response');
  }
  return imageUrl;
}

export async function generateImage(
  apiKeys: { google?: string; openai?: string },
  options: ImageGenerationOptions,
  visualProfile?: VisualStyleProfile
): Promise<{ url: string; generator: string; cost: number }> {
  const hasGoogle = !!apiKeys.google;
  const hasOpenAI = !!apiKeys.openai;

  if (!hasGoogle && !hasOpenAI) {
    throw new Error('GOOGLE_AI_API_KEY or OPENAI_API_KEY is required for image generation');
  }

  const enhancedPrompt = buildDemosPrompt(options.prompt, visualProfile);
  const preferImagen = options.generator !== 'dalle';

  try {
    // Try Imagen first if available and preferred
    if (hasGoogle && preferImagen) {
      try {
        const url = await generateWithImagen(apiKeys.google!, enhancedPrompt);
        return { url, generator: 'Google Imagen 4', cost: 0.02 };
      } catch (imagenError: any) {
        console.warn('Imagen failed, trying DALL-E fallback:', imagenError.message);
        if (!hasOpenAI) throw imagenError;
      }
    }

    // Fall back to DALL-E or use it as primary
    if (hasOpenAI) {
      const url = await generateWithDALLE(apiKeys.openai!, enhancedPrompt, options);
      const cost = options.quality === 'hd' ? 0.12 : 0.04;
      return { url, generator: 'DALL-E 3', cost };
    }

    // If we get here with only Google, try Imagen
    if (hasGoogle) {
      const url = await generateWithImagen(apiKeys.google!, enhancedPrompt);
      return { url, generator: 'Google Imagen 4', cost: 0.02 };
    }

    throw new Error('No image generator available');
  } catch (error: any) {
    if (error.code === 'content_policy_violation') {
      throw new Error('Content policy violation. Please revise the prompt.');
    }
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Image generation failed: ${error.message}`);
  }
}

export function estimateImageCost(
  generator: 'imagen' | 'dalle' = 'imagen',
  quality: 'standard' | 'hd' = 'standard'
): number {
  // Google Imagen 4: ~$0.02 per image
  // DALL-E 3: $0.04 (standard) or $0.12 (hd)
  if (generator === 'imagen') {
    return 0.02;
  }
  return quality === 'hd' ? 0.12 : 0.04;
}
