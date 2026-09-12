import { PredictionServiceClient } from '@google-cloud/aiplatform';
import fs from 'fs/promises';
import path from 'path';

export interface ImageGenerationRequest {
  contentType: 'ship' | 'trend' | 'educational' | 'weekly' | 'quote';
  mainMessage: string;
  context?: string;
  style?: 'minimal' | 'technical' | 'abstract' | 'illustrative';
  aspectRatio?: '1:1' | '16:9' | '9:16';
}

export interface GeneratedImage {
  localPath: string;
  prompt: string;
  model: string;
  generatedAt: string;
}

const DEMOS_BRAND_GUIDELINES = {
  colors: {
    primary: '#2B36D9',      // Palatinate Blue
    secondary: '#FF4808',    // Solar Flame
    accent1: '#FF35F9',      // Fuchsia/Magenta
    accent2: '#00DAFF',      // Sky Blue/Cyan
    dark: '#010109',         // Background dark
    light: '#F2F2F0',        // Background light
  },
  style: 'modern minimalist tech aesthetic with precise geometric elements',
  mood: 'professional, innovative, technical but approachable',
};

/**
 * Google Vertex AI Imagen-based image generator
 * Replaces DALL-E with Google's Imagen 3 model
 */
export class ImagenGenerator {
  private client: PredictionServiceClient;
  private projectId: string;
  private location: string;
  private outputDir: string;
  private model: string;

  constructor(options: {
    projectId?: string;
    location?: string;
    outputDir?: string;
    model?: string;
  } = {}) {
    this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT || '';
    this.location = options.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.outputDir = options.outputDir || './generated-images';
    this.model = options.model || 'imagen-3.0-generate-001';

    // Initialize the Vertex AI client
    this.client = new PredictionServiceClient({
      apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
    });

    if (!this.projectId) {
      console.warn('GOOGLE_CLOUD_PROJECT not set. Image generation will fail.');
    }
  }

  /**
   * Generate image using Google Imagen
   */
  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const prompt = this.buildPrompt(request);
    const aspectRatio = request.aspectRatio || '1:1';

    try {
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}`;

      const [response] = await this.client.predict({
        endpoint,
        instances: [
          {
            structValue: {
              fields: {
                prompt: { stringValue: prompt },
              },
            },
          },
        ],
        parameters: {
          structValue: {
            fields: {
              sampleCount: { numberValue: 1 },
              aspectRatio: { stringValue: aspectRatio },
              safetyFilterLevel: { stringValue: 'block_some' },
              personGeneration: { stringValue: 'dont_allow' },
              addWatermark: { boolValue: false },
            },
          },
        },
      });

      if (!response.predictions || response.predictions.length === 0) {
        throw new Error('No predictions returned from Imagen');
      }

      // Extract base64 image from response
      const prediction = response.predictions[0];
      const imageBytes = prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;

      if (!imageBytes) {
        throw new Error('No image data in response');
      }

      // Save image to file
      const localPath = await this.saveImage(imageBytes, request.contentType);

      return {
        localPath,
        prompt,
        model: this.model,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Imagen generation failed:', error.message);

      // Fallback to placeholder if Imagen fails
      if (error.message.includes('not set') || error.message.includes('credentials')) {
        console.log('Falling back to placeholder image generation');
        return this.generatePlaceholder(request);
      }

      throw error;
    }
  }

  /**
   * Build Imagen prompt with Demos branding
   */
  private buildPrompt(request: ImageGenerationRequest): string {
    const { contentType, mainMessage, context, style = 'minimal' } = request;

    const colorDescription = `using deep blue (#2B36D9) and vibrant orange (#FF4808) as accent colors on a dark (#010109) background`;
    const styleBase = `${DEMOS_BRAND_GUIDELINES.style}, ${colorDescription}`;

    let prompt = '';

    switch (contentType) {
      case 'ship':
        prompt = `Modern tech announcement graphic for software launch.
Topic: "${mainMessage}".
Style: ${styleBase}.
Visual elements: Abstract representation of blockchain technology, interconnected nodes, data flow visualization.
${style === 'minimal' ? 'Extremely minimal composition with generous negative space.' : 'Technical but visually engaging.'}
No text, no words, no letters. Clean, professional, suitable for tech company social media.
High quality digital art, 4K resolution.`;
        break;

      case 'trend':
        prompt = `Conceptual tech illustration representing: "${mainMessage}".
Style: ${styleBase}.
${context ? `Additional context: ${context}` : ''}
${style === 'minimal' ? 'Minimal geometric design with clean lines.' : 'Engaging visual metaphor with abstract shapes.'}
No text, no words. Professional tech aesthetic, suitable for social media.
High quality digital art.`;
        break;

      case 'educational':
        prompt = `Educational tech diagram illustrating: "${mainMessage}".
Style: ${styleBase}.
Visual approach: Clean visual metaphor showing interconnected systems, data flow, or network architecture.
${style === 'technical' ? 'Technical diagram aesthetic with precise lines and nodes.' : 'Approachable illustration style with soft gradients.'}
No text labels, no words. Clear visual hierarchy.
High quality digital art, professional.`;
        break;

      case 'weekly':
        prompt = `Abstract tech background for weekly summary graphic.
Style: ${styleBase}.
Visual elements: Geometric patterns suggesting progress, growth, and forward momentum.
Very minimal composition, lots of space for text overlay.
Professional, subtly celebratory but not flashy.
No text, no words. High quality digital art.`;
        break;

      case 'quote':
        prompt = `Minimal background for quote graphic.
Style: ${styleBase}.
Visual: Subtle gradient or geometric pattern that won't compete with overlaid text.
Colors should be muted versions of brand colors.
Professional, modern, generous negative space.
No text, no words. High quality digital art.`;
        break;

      default:
        prompt = `Modern minimalist tech graphic. ${styleBase}. No text, no words. High quality digital art.`;
    }

    return prompt;
  }

  /**
   * Save base64 image to file
   */
  private async saveImage(base64Data: string, contentType: string): Promise<string> {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Generate filename
    const timestamp = Date.now();
    const filename = `${contentType}-${timestamp}.png`;
    const filepath = path.join(this.outputDir, filename);

    // Decode and save
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filepath, buffer);

    console.log(`✓ Saved image: ${filepath}`);
    return filepath;
  }

  /**
   * Generate a placeholder image when Imagen is unavailable
   * Uses Canvas to create a simple branded placeholder
   */
  private async generatePlaceholder(request: ImageGenerationRequest): Promise<GeneratedImage> {
    try {
      // Dynamic import to handle cases where canvas isn't installed
      const { createCanvas } = await import('canvas');

      const width = 1024;
      const height = 1024;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Dark background
      ctx.fillStyle = DEMOS_BRAND_GUIDELINES.colors.dark;
      ctx.fillRect(0, 0, width, height);

      // Draw geometric shapes with brand colors
      ctx.fillStyle = DEMOS_BRAND_GUIDELINES.colors.primary;
      ctx.globalAlpha = 0.3;

      // Abstract circles
      ctx.beginPath();
      ctx.arc(width * 0.3, height * 0.3, 150, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = DEMOS_BRAND_GUIDELINES.colors.secondary;
      ctx.beginPath();
      ctx.arc(width * 0.7, height * 0.6, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = DEMOS_BRAND_GUIDELINES.colors.accent2;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.8, 80, 0, Math.PI * 2);
      ctx.fill();

      // Reset alpha
      ctx.globalAlpha = 1.0;

      // Draw connecting lines
      ctx.strokeStyle = DEMOS_BRAND_GUIDELINES.colors.primary;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.3, height * 0.3);
      ctx.lineTo(width * 0.7, height * 0.6);
      ctx.lineTo(width * 0.5, height * 0.8);
      ctx.stroke();

      // Save to file
      const timestamp = Date.now();
      const filename = `${request.contentType}-placeholder-${timestamp}.png`;
      await fs.mkdir(this.outputDir, { recursive: true });
      const filepath = path.join(this.outputDir, filename);

      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(filepath, buffer);

      console.log(`✓ Generated placeholder: ${filepath}`);

      return {
        localPath: filepath,
        prompt: `Placeholder for: ${request.mainMessage}`,
        model: 'canvas-placeholder',
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Placeholder generation failed:', error.message);
      throw new Error(`Could not generate image: ${error.message}`);
    }
  }

  /**
   * Clean up old generated images
   */
  async cleanup(daysOld = 7): Promise<number> {
    try {
      const files = await fs.readdir(this.outputDir);
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.outputDir, file);
        const stats = await fs.stat(filepath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error: any) {
      console.error('Cleanup failed:', error.message);
      return 0;
    }
  }

  /**
   * Check if Imagen is properly configured
   */
  isConfigured(): boolean {
    return !!this.projectId;
  }
}

export default ImagenGenerator;
