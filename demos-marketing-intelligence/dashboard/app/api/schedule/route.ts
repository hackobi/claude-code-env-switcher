import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');
const ENV_PATH = path.join(process.cwd(), '..', '.env');

interface ContentRow {
  id: number;
  content_type: string;
  content: string;
  status: string;
  typefully_id: string | null;
  image_path: string | null;
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

/**
 * Get the social set ID from Typefully
 * Required for v2 API endpoints
 */
async function getSocialSetId(apiKey: string): Promise<string> {
  const response = await fetch('https://api.typefully.com/v2/social-sets', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get social sets: ${response.status}`);
  }

  const data = await response.json();
  // Return the first social set (usually the primary Twitter/X account)
  // v2 API returns { results: [...] }, not { social_sets: [...] }
  if (data.results && data.results.length > 0) {
    return data.results[0].id.toString();
  }
  throw new Error('No social sets found in Typefully account');
}

/**
 * Upload image to Typefully using v2 API
 * Returns the media_id to attach to the draft
 */
async function uploadImageToTypefully(
  apiKey: string,
  socialSetId: string,
  imageDataUrl: string
): Promise<string> {
  // Extract base64 data and determine file type
  const matches = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image data URL format');
  }

  const [, imageType, base64Data] = matches;
  const fileName = `image-${Date.now()}.${imageType === 'jpeg' ? 'jpg' : imageType}`;

  // Step 1: Request presigned upload URL
  const uploadRequestResponse = await fetch(
    `https://api.typefully.com/v2/social-sets/${socialSetId}/media/upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_name: fileName }),
    }
  );

  if (!uploadRequestResponse.ok) {
    const error = await uploadRequestResponse.text();
    throw new Error(`Failed to get upload URL: ${uploadRequestResponse.status} - ${error}`);
  }

  const { media_id, upload_url } = await uploadRequestResponse.json();

  // Step 2: Upload the image to S3
  // S3 presigned URL requires specific headers that were signed:
  // - x-amz-meta-* headers must be included
  // - Content-Type must be empty/omitted (not set to image/*)
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'x-amz-meta-upload-source': 'api',
      'x-amz-meta-file-id': media_id,
      'x-amz-meta-high-quality-uploads': 'true',
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[Schedule] S3 upload failed:', errorText);
    throw new Error(`Failed to upload image to S3: ${uploadResponse.status}`);
  }

  // Step 3: Wait for processing to complete
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(
      `https://api.typefully.com/v2/social-sets/${socialSetId}/media/${media_id}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      if (statusData.status === 'ready') {
        return media_id;
      } else if (statusData.status === 'failed') {
        throw new Error('Image processing failed');
      }
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Image processing timed out');
}

/**
 * Parse thread content into individual tweets
 * Threads use '---' as separators between tweets
 */
function parseThreadContent(content: string): string[] {
  // Split by '---' separator (with optional whitespace)
  const parts = content.split(/\n---\n|\n---$|^---\n/);

  // Clean up each part and filter out empty ones
  return parts
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

/**
 * Create draft using Typefully v2 API with optional image
 * Supports both single tweets and threads
 */
async function scheduleToTypefullyV2(
  apiKey: string,
  socialSetId: string,
  content: string,
  contentType: string,
  mediaId?: string
): Promise<{ id: string }> {
  // Parse content into posts array
  let posts: { text: string; media_ids?: string[] }[];

  // Check if this is a thread (either by type or content containing '---')
  const isThread = contentType === 'thread' || content.includes('\n---\n');

  if (isThread) {
    const tweetParts = parseThreadContent(content);
    console.log(`[Schedule] Parsed thread into ${tweetParts.length} tweets`);

    // First tweet gets the image (if any)
    posts = tweetParts.map((text, index) => {
      const post: { text: string; media_ids?: string[] } = { text };
      if (index === 0 && mediaId) {
        post.media_ids = [mediaId];
      }
      return post;
    });
  } else {
    // Single tweet
    const post: { text: string; media_ids?: string[] } = { text: content };
    if (mediaId) {
      post.media_ids = [mediaId];
    }
    posts = [post];
  }

  const response = await fetch(
    `https://api.typefully.com/v2/social-sets/${socialSetId}/drafts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platforms: {
          x: {
            enabled: true,
            posts,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Typefully API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { id: data.id || data.draft_id || 'created' };
}


export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    // Load environment variables
    const env = await loadEnv();
    const apiKey = env.TYPEFULLY_API_KEY;

    if (!apiKey || apiKey === 'your_typefully_api_key') {
      return NextResponse.json(
        { error: 'TYPEFULLY_API_KEY not configured. Add it to demos-marketing-intelligence/.env' },
        { status: 400 }
      );
    }

    // Check database exists
    try {
      await fs.access(DB_PATH);
    } catch {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const db = new Database(DB_PATH);

    // Find the content item (including image_path)
    const stmt = db.prepare('SELECT id, content_type, content, status, typefully_id, image_path FROM generated_content WHERE id = ?');
    const row = stmt.get(parseInt(id)) as ContentRow | undefined;

    if (!row) {
      db.close();
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    let result: { id: string };
    let usedV2 = false;

    // Check if we have an image (data URL format)
    const hasImage = row.image_path && row.image_path.startsWith('data:image/');

    console.log('[Schedule] Using Typefully v2 API...');
    const socialSetId = await getSocialSetId(apiKey);
    console.log('[Schedule] Got social set ID:', socialSetId);

    let mediaId: string | undefined;
    if (hasImage) {
      mediaId = await uploadImageToTypefully(apiKey, socialSetId, row.image_path!);
      console.log('[Schedule] Uploaded image, media_id:', mediaId);
    }

    result = await scheduleToTypefullyV2(apiKey, socialSetId, row.content, row.content_type, mediaId);
    usedV2 = true;
    const isThread = row.content_type === 'thread' || row.content.includes('\n---\n');
    console.log('[Schedule] Created draft via v2 API', isThread ? 'as thread' : 'single tweet', hasImage ? 'with image' : 'text only');

    // Update the item status and typefully_id in database
    const updateStmt = db.prepare(
      'UPDATE generated_content SET status = ?, typefully_id = ?, scheduled_for = ? WHERE id = ?'
    );
    updateStmt.run('scheduled', result.id, new Date().toISOString(), parseInt(id));

    db.close();

    return NextResponse.json({
      success: true,
      typefullyId: result.id,
      usedV2Api: usedV2,
      hasImage: hasImage,
      item: {
        id: row.id.toString(),
        status: 'scheduled',
        typefullyId: result.id,
      },
    });
  } catch (error) {
    console.error('Failed to schedule content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule content' },
      { status: 500 }
    );
  }
}
