import { createCanvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

export interface TemplateData {
  type: 'quote' | 'stat' | 'weekly-summary' | 'announcement';
  primaryText: string;
  secondaryText?: string;
  metrics?: Array<{ label: string; value: string }>;
  date?: string;
}

const DEMOS_COLORS = {
  blue: '#2B36D9',
  orange: '#FF4808',
  magenta: '#FF35F9',
  cyan: '#00DAFF',
  darkBg: '#010109',
  darkSecondary: '#0D0E13',
  lightBg: '#FFFFFF',
  lightSecondary: '#F2F2F0',
  text: {
    dark: '#FAFAFA',
    darkMuted: '#A1A1AA',
    light: '#0F172A',
    lightMuted: '#475569',
  },
};

export class TemplateGenerator {
  private outputDir: string;

  constructor(outputDir = './generated-images') {
    this.outputDir = outputDir;
  }

  /**
   * Generate quote card
   */
  async generateQuoteCard(quote: string, author?: string): Promise<string> {
    const width = 1200;
    const height = 630; // Twitter/OG image dimensions

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, DEMOS_COLORS.darkBg);
    gradient.addColorStop(1, DEMOS_COLORS.darkSecondary);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Accent line
    ctx.fillStyle = DEMOS_COLORS.blue;
    ctx.fillRect(60, 60, 8, height - 120);

    // Quote text
    ctx.fillStyle = DEMOS_COLORS.text.dark;
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'left';

    const lines = this.wrapText(ctx as any, quote, width - 200);
    let y = height / 2 - (lines.length * 60) / 2;

    for (const line of lines) {
      ctx.fillText(line, 100, y);
      y += 60;
    }

    // Author
    if (author) {
      ctx.fillStyle = DEMOS_COLORS.text.darkMuted;
      ctx.font = '24px Inter, sans-serif';
      ctx.fillText(`— ${author}`, 100, height - 80);
    }

    // Demos branding
    ctx.fillStyle = DEMOS_COLORS.blue;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('DEMOS NETWORK', width - 220, height - 80);

    // Save
    return await this.saveCanvas(canvas, 'quote');
  }

  /**
   * Generate weekly summary card
   */
  async generateWeeklySummary(data: {
    weekNumber: number;
    shipped: number;
    engagement: number;
    growth: number;
    highlights: string[];
  }): Promise<string> {
    const width = 1200;
    const height = 1200; // Square for Instagram/Twitter

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = DEMOS_COLORS.darkBg;
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.fillStyle = DEMOS_COLORS.text.dark;
    ctx.font = 'bold 64px Inter, sans-serif';
    ctx.fillText(`Week ${data.weekNumber} at Demos`, 60, 120);

    // Metrics grid
    const metrics = [
      { label: 'Features Shipped', value: data.shipped.toString(), color: DEMOS_COLORS.blue },
      { label: 'Total Engagement', value: data.engagement.toString(), color: DEMOS_COLORS.orange },
      { label: 'Community Growth', value: `+${data.growth}%`, color: DEMOS_COLORS.magenta },
    ];

    let metricsY = 220;
    metrics.forEach((metric) => {
      // Metric value
      ctx.fillStyle = metric.color;
      ctx.font = 'bold 96px Inter, sans-serif';
      ctx.fillText(metric.value, 60, metricsY);

      // Metric label
      ctx.fillStyle = DEMOS_COLORS.text.darkMuted;
      ctx.font = '24px Inter, sans-serif';
      ctx.fillText(metric.label, 60, metricsY + 40);

      metricsY += 200;
    });

    // Highlights
    ctx.fillStyle = DEMOS_COLORS.text.dark;
    ctx.font = '32px Inter, sans-serif';
    ctx.fillText('Highlights:', 60, 880);

    ctx.font = '28px Inter, sans-serif';
    ctx.fillStyle = DEMOS_COLORS.text.darkMuted;
    data.highlights.slice(0, 2).forEach((highlight, i) => {
      ctx.fillText(`• ${highlight}`, 60, 930 + i * 50);
    });

    // Footer
    ctx.fillStyle = DEMOS_COLORS.blue;
    ctx.fillRect(60, height - 120, width - 120, 4);
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText('demos.sh', 60, height - 60);

    return await this.saveCanvas(canvas, 'weekly');
  }

  /**
   * Generate ship announcement card
   */
  async generateShipAnnouncement(
    feature: string,
    description: string
  ): Promise<string> {
    const width = 1200;
    const height = 630;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background with subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, DEMOS_COLORS.darkBg);
    gradient.addColorStop(1, '#0A0F2C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Rocket emoji (ship indicator)
    ctx.font = '120px sans-serif';
    ctx.fillText('🚀', 60, 180);

    // "SHIPPED" badge
    ctx.fillStyle = DEMOS_COLORS.orange;
    ctx.fillRect(220, 100, 200, 60);
    ctx.fillStyle = DEMOS_COLORS.darkBg;
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillText('SHIPPED', 240, 142);

    // Feature name
    ctx.fillStyle = DEMOS_COLORS.text.dark;
    ctx.font = 'bold 56px Inter, sans-serif';
    const featureLines = this.wrapText(ctx as any, feature, width - 120);
    let y = 250;
    featureLines.forEach(line => {
      ctx.fillText(line, 60, y);
      y += 70;
    });

    // Description
    ctx.fillStyle = DEMOS_COLORS.text.darkMuted;
    ctx.font = '32px Inter, sans-serif';
    const descLines = this.wrapText(ctx as any, description, width - 120);
    descLines.slice(0, 2).forEach(line => {
      ctx.fillText(line, 60, y);
      y += 45;
    });

    // Demos branding
    ctx.fillStyle = DEMOS_COLORS.blue;
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('DEMOS NETWORK', width - 260, height - 40);

    return await this.saveCanvas(canvas, 'ship');
  }

  /**
   * Generate stat/metric card
   */
  async generateStatCard(
    metric: string,
    value: string,
    context?: string
  ): Promise<string> {
    const width = 800;
    const height = 800;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = DEMOS_COLORS.darkBg;
    ctx.fillRect(0, 0, width, height);

    // Geometric accent
    ctx.fillStyle = DEMOS_COLORS.blue;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.2, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Main value (centered)
    ctx.fillStyle = DEMOS_COLORS.orange;
    ctx.font = 'bold 180px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value, width / 2, height / 2 + 20);

    // Metric label
    ctx.fillStyle = DEMOS_COLORS.text.dark;
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText(metric, width / 2, height / 2 + 100);

    // Context
    if (context) {
      ctx.fillStyle = DEMOS_COLORS.text.darkMuted;
      ctx.font = '28px Inter, sans-serif';
      ctx.fillText(context, width / 2, height / 2 + 150);
    }

    // Demos branding
    ctx.fillStyle = DEMOS_COLORS.blue;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('DEMOS NETWORK', width / 2, height - 60);

    return await this.saveCanvas(canvas, 'stat');
  }

  /**
   * Wrap text to fit within width
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Save canvas to file
   */
  private async saveCanvas(
    canvas: any,
    prefix: string
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${prefix}-${timestamp}.png`;
    const filepath = path.join(this.outputDir, filename);

    await fs.mkdir(this.outputDir, { recursive: true });

    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(filepath, buffer);

    return filepath;
  }
}

export default TemplateGenerator;
