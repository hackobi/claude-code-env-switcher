import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export interface ImageGenerationRequest {
  contentType: 'ship' | 'trend' | 'educational' | 'weekly' | 'quote';
  mainMessage: string;
  context?: string;
  style?: 'minimal' | 'technical' | 'abstract' | 'illustrative';
}

export interface GeneratedImage {
  url: string;
  localPath: string;
  prompt: string;
  revisedPrompt?: string;
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
  fonts: 'Inter for UI elements, clean sans-serif',
  mood: 'professional, innovative, technical but approachable',
};

export class ImageGenerator {
  private openai: OpenAI;
  private outputDir: string;

  constructor(apiKey: string, outputDir = './generated-images') {
    this.openai = new OpenAI({ apiKey });
    this.outputDir = outputDir;
  }

  /**
   * Generate image for content
   */
  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const prompt = this.buildPrompt(request);

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1024x1024',
        quality: 'hd',
        n: 1,
        style: request.style === 'minimal' ? 'natural' : 'vivid',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data returned from DALL-E');
      }

      const imageUrl = response.data[0].url;
      const revisedPrompt = response.data[0].revised_prompt;

      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E');
      }

      // Download and save image
      const localPath = await this.downloadImage(imageUrl, request.contentType);

      return {
        url: imageUrl,
        localPath,
        prompt,
        revisedPrompt,
      };
    } catch (error: any) {
      console.error('Image generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Build DALL-E prompt with Demos branding
   */
  private buildPrompt(request: ImageGenerationRequest): string {
    const { contentType, mainMessage, context, style = 'minimal' } = request;

    const baseStyle = `${DEMOS_BRAND_GUIDELINES.style}, using colors ${DEMOS_BRAND_GUIDELINES.colors.primary} (blue) and ${DEMOS_BRAND_GUIDELINES.colors.secondary} (orange)`;

    let prompt = '';

    switch (contentType) {
      case 'ship':
        prompt = `Modern tech announcement graphic for "${mainMessage}".
        ${baseStyle}.
        Show abstract representation of blockchain technology, cross-chain connectivity, or distributed networks.
        ${style === 'minimal' ? 'Extremely minimal, lots of negative space' : 'Technical but visually interesting'}.
        No text in image. Clean, professional, suitable for tech company announcement.`;
        break;

      case 'trend':
        prompt = `Conceptual tech illustration about "${mainMessage}".
        ${baseStyle}.
        ${context || 'Abstract representation of the concept'}.
        ${style === 'minimal' ? 'Minimal geometric design' : 'Engaging visual metaphor'}.
        No text. Professional tech aesthetic.`;
        break;

      case 'educational':
        prompt = `Educational tech diagram illustrating "${mainMessage}".
        ${baseStyle}.
        Show concept through clean visual metaphor - think interconnected nodes, data flow, or system architecture.
        ${style === 'technical' ? 'Technical diagram style' : 'Approachable illustration style'}.
        No text labels. Clear visual hierarchy.`;
        break;

      case 'weekly':
        prompt = `Abstract tech background for weekly summary graphic.
        ${baseStyle}.
        Geometric patterns suggesting progress, growth, and forward movement.
        Very minimal, lots of space for text overlay.
        Professional, celebratory but not overly flashy.`;
        break;

      case 'quote':
        prompt = `Minimal background for quote graphic.
        ${baseStyle}.
        Subtle gradient or geometric pattern that won't compete with text.
        Professional, modern, lots of negative space.
        Colors should be muted versions of brand colors.`;
        break;

      default:
        prompt = `Modern minimalist tech graphic. ${baseStyle}. No text.`;
    }

    // Add quality modifiers
    prompt += ' | High quality, professional, suitable for social media, 16:9 or square aspect ratio.';

    return prompt;
  }

  /**
   * Download generated image to local storage
   */
  private async downloadImage(url: string, contentType: string): Promise<string> {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Download image
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Generate filename
      const timestamp = Date.now();
      const filename = `${contentType}-${timestamp}.png`;
      const filepath = path.join(this.outputDir, filename);

      // Save to disk
      await fs.writeFile(filepath, buffer);

      return filepath;
    } catch (error: any) {
      console.error('Failed to download image:', error.message);
      throw error;
    }
  }

  /**
   * Generate variation of existing image
   */
  async generateVariation(imagePath: string): Promise<GeneratedImage> {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

      const response = await this.openai.images.createVariation({
        model: 'dall-e-2', // Variations only work with DALL-E 2
        image: imageFile,
        n: 1,
        size: '1024x1024',
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No variation data returned from DALL-E');
      }

      const imageUrl = response.data[0].url;

      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      const localPath = await this.downloadImage(imageUrl, 'variation');

      return {
        url: imageUrl,
        localPath,
        prompt: 'Variation of original image',
      };
    } catch (error: any) {
      console.error('Variation generation failed:', error.message);
      throw error;
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
}

export default ImageGenerator;
