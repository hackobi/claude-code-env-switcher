import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';

// Logo paths - full logo with "demos" text
const LOGO_WHITE_PATH = path.join(process.cwd(), 'public', 'assets', 'demos-logo-white.png');
const LOGO_SVG_PATH = path.join(process.cwd(), 'public', 'assets', 'demos-logo-white.svg');
const ICON_PATH = path.join(process.cwd(), 'public', 'assets', 'demos-icon-white.png');

interface OverlayOptions {
  logoScale?: number; // 0.15 = 15% of image width
  padding?: number; // pixels from edge
  tagline?: string; // Summary text from tweet content (shown at bottom)
  opacity?: number; // Logo/text opacity (0-1)
}

const DEFAULT_OPTIONS: Required<OverlayOptions> = {
  logoScale: 0.18, // Full logo (icon + "demos" text) at 18% of image width
  padding: 40,
  tagline: '',
  opacity: 0.95,
};

/**
 * Escape special XML characters for SVG text
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Word wrap text to fit within a max width
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.slice(0, 2); // Max 2 lines for cleaner look
}

/**
 * Create text overlay SVG for bottom tagline
 * Uses Source Code Pro (monospace) per Demos brand guidelines
 * Text is CENTER-ALIGNED at the bottom
 * Font size scales with image dimensions for consistent appearance
 */
function createBottomTextSvg(
  width: number,
  height: number,
  taglineLines: string[],
  padding: number
): string {
  // Scale font size based on image width (larger for Twitter 16:9 images)
  // Base: 38px at 1200px width, scales proportionally
  const taglineFontSize = Math.round(width * 0.032); // ~38px at 1200px
  const lineHeight = taglineFontSize * 1.4;

  // Calculate Y positions from bottom (centered horizontally)
  const totalTextHeight = taglineLines.length * lineHeight;
  const startY = height - padding - totalTextHeight + taglineFontSize;
  const centerX = width / 2;

  // Source Code Pro - Demos brand typography for technical/code content
  const fontFamily = "'Source Code Pro', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace";

  // Build tagline text elements with drop shadow - CENTER ALIGNED
  const taglineElements = taglineLines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `
        <!-- Shadow -->
        <text
          x="${centerX + 3}"
          y="${y + 3}"
          fill="rgba(0,0,0,0.85)"
          font-family="${fontFamily}"
          font-size="${taglineFontSize}"
          font-weight="600"
          letter-spacing="0.02em"
          text-anchor="middle"
          filter="url(#blur)"
        >${escapeXml(line)}</text>
        <!-- Text -->
        <text
          x="${centerX}"
          y="${y}"
          fill="rgba(255,255,255,0.98)"
          font-family="${fontFamily}"
          font-size="${taglineFontSize}"
          font-weight="600"
          letter-spacing="0.02em"
          text-anchor="middle"
        >${escapeXml(line)}</text>`;
    })
    .join('\n');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
        </filter>
      </defs>
      ${taglineElements}
    </svg>
  `;
}

/**
 * Apply Demos branding overlay to an image
 * - Logo in TOP LEFT
 * - Tagline text at BOTTOM LEFT
 */
export async function applyLogoOverlay(
  imageSource: string,
  options: OverlayOptions = {}
): Promise<string> {
  console.log('[Overlay] Starting applyLogoOverlay');
  console.log('[Overlay] Options:', JSON.stringify(options));
  console.log('[Overlay] Image source type:', imageSource.startsWith('data:') ? 'base64' : imageSource.startsWith('http') ? 'url' : 'unknown');

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get image buffer from source
  let imageBuffer: Buffer;

  if (imageSource.startsWith('data:')) {
    // Base64 data URL
    const base64Data = imageSource.split(',')[1];
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (imageSource.startsWith('http')) {
    // Fetch from URL
    const response = await fetch(imageSource);
    const arrayBuffer = await response.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('Invalid image source');
  }

  // Get image metadata
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const imageWidth = metadata.width || 1024;
  const imageHeight = metadata.height || 1024;

  // Load logo (prefer PNG for better quality)
  console.log('[Overlay] Loading logo from:', LOGO_WHITE_PATH);
  let logoBuffer: Buffer;
  try {
    logoBuffer = await fs.readFile(LOGO_WHITE_PATH);
    console.log('[Overlay] Logo loaded, size:', logoBuffer.length, 'bytes');
  } catch (logoError) {
    console.log('[Overlay] PNG logo load failed:', logoError);
    try {
      // Fallback to SVG
      const logoSvg = await fs.readFile(LOGO_SVG_PATH, 'utf-8');
      logoBuffer = await sharp(Buffer.from(logoSvg)).png().toBuffer();
    } catch {
      // Fallback to icon
      logoBuffer = await fs.readFile(ICON_PATH);
    }
  }

  // Calculate logo dimensions
  const logoTargetWidth = Math.round(imageWidth * opts.logoScale);
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoTargetWidth, null, { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp(resizedLogo).metadata();

  // Prepare text content
  const tagline = opts.tagline || '';

  // Wrap tagline to fit - monospace chars are ~0.6x font size width
  // For ~31px font at 1200px width, each char is ~18px, so ~60 chars fit
  const maxCharsPerLine = Math.floor((imageWidth - opts.padding * 2) / (imageWidth * 0.016));
  const taglineLines = tagline ? wrapText(tagline, maxCharsPerLine) : [];

  // Build composite layers
  const composites: sharp.OverlayOptions[] = [];

  // === TOP LEFT: Logo + "Demos" text ===
  const logoLeft = opts.padding;
  const logoTop = opts.padding;

  // Add logo shadow
  const shadowLogo = await sharp(resizedLogo)
    .modulate({ brightness: 0 })
    .blur(4)
    .ensureAlpha(0.4)
    .toBuffer();

  composites.push({
    input: shadowLogo,
    left: Math.max(0, logoLeft + 3),
    top: Math.max(0, logoTop + 3),
    blend: 'over' as const,
  });

  // Add the actual logo
  composites.push({
    input: resizedLogo,
    left: Math.max(0, logoLeft),
    top: Math.max(0, logoTop),
  });

  // === BOTTOM: Tagline text ===
  if (taglineLines.length > 0) {
    const textSvg = createBottomTextSvg(
      imageWidth,
      imageHeight,
      taglineLines,
      opts.padding
    );

    composites.push({
      input: Buffer.from(textSvg),
      left: 0,
      top: 0,
    });
  }

  // Composite all layers onto the image
  console.log('[Overlay] Compositing', composites.length, 'layers');
  const result = await image
    .composite(composites)
    .png()
    .toBuffer();

  console.log('[Overlay] Final image size:', result.length, 'bytes');
  // Return as base64 data URL
  return `data:image/png;base64,${result.toString('base64')}`;
}

/**
 * Check if the logo files exist
 */
export async function checkLogoAssets(): Promise<{
  pngExists: boolean;
  svgExists: boolean;
  iconExists: boolean;
}> {
  let pngExists = false;
  let svgExists = false;
  let iconExists = false;

  try {
    await fs.access(LOGO_WHITE_PATH);
    pngExists = true;
  } catch {}

  try {
    await fs.access(LOGO_SVG_PATH);
    svgExists = true;
  } catch {}

  try {
    await fs.access(ICON_PATH);
    iconExists = true;
  } catch {}

  return { pngExists, svgExists, iconExists };
}
