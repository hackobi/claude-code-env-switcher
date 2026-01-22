import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');
const ENV_PATH = path.join(process.cwd(), '..', '.env');

interface TypefullyDraft {
  id: string;
  content: string[];
  created_at: string;
  status: 'draft' | 'scheduled' | 'published';
  share_status?: 'shared' | 'not_shared';
  scheduled_date?: string;
  url?: string;
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
 * Fetch drafts from Typefully API
 */
async function fetchTypefullyDrafts(apiKey: string): Promise<TypefullyDraft[]> {
  const response = await fetch('https://api.typefully.com/v1/drafts', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Typefully API error: ${response.status}`);
  }

  const data = await response.json();
  return data.drafts || [];
}

/**
 * Get published tweets from Typefully (those that have been shared)
 */
async function fetchTypefullyPublished(apiKey: string): Promise<TypefullyDraft[]> {
  const response = await fetch('https://api.typefully.com/v1/drafts?filter=published', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // Some plans may not support this endpoint
    console.warn('Could not fetch published drafts from Typefully');
    return [];
  }

  const data = await response.json();
  return data.drafts || [];
}

/**
 * Sync Typefully status back to our database
 */
function syncToDatabase(typefullyDrafts: TypefullyDraft[]): {
  updated: number;
  published: number;
} {
  let updated = 0;
  let published = 0;

  try {
    const db = new Database(DB_PATH);

    // Get all our items with typefully IDs
    const localItems = db.prepare(`
      SELECT id, typefully_id, status FROM generated_content
      WHERE typefully_id IS NOT NULL
    `).all() as { id: number; typefully_id: string; status: string }[];

    // Create a map of Typefully drafts by ID
    const typefullyMap = new Map<string, TypefullyDraft>();
    for (const draft of typefullyDrafts) {
      typefullyMap.set(draft.id, draft);
    }

    // Update local statuses based on Typefully
    const updateStmt = db.prepare(`
      UPDATE generated_content SET status = ?, published_at = ? WHERE id = ?
    `);

    for (const item of localItems) {
      const tfDraft = typefullyMap.get(item.typefully_id);

      if (tfDraft) {
        let newStatus = item.status;
        let publishedAt: string | null = null;

        // Map Typefully status to our status
        if (tfDraft.share_status === 'shared' || tfDraft.status === 'published') {
          newStatus = 'published';
          publishedAt = new Date().toISOString();
          if (item.status !== 'published') {
            published++;
          }
        } else if (tfDraft.status === 'scheduled' && item.status !== 'published') {
          newStatus = 'scheduled';
        }

        if (newStatus !== item.status) {
          updateStmt.run(newStatus, publishedAt, item.id);
          updated++;
        }
      }
    }

    db.close();
    return { updated, published };
  } catch (error) {
    console.error('Database sync error:', error);
    return { updated: 0, published: 0 };
  }
}

/**
 * GET: Fetch current sync status and Typefully data
 */
export async function GET() {
  try {
    const env = await loadEnv();
    const apiKey = env.TYPEFULLY_API_KEY;

    if (!apiKey || apiKey === 'your_typefully_api_key') {
      return NextResponse.json({
        configured: false,
        message: 'Typefully API key not configured',
      });
    }

    // Fetch drafts from Typefully
    const drafts = await fetchTypefullyDrafts(apiKey);

    // Count statuses
    const statusCounts = {
      draft: drafts.filter(d => d.status === 'draft' && d.share_status !== 'shared').length,
      scheduled: drafts.filter(d => d.status === 'scheduled').length,
      published: drafts.filter(d => d.share_status === 'shared' || d.status === 'published').length,
    };

    return NextResponse.json({
      configured: true,
      drafts: drafts.length,
      statusCounts,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Typefully sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync with Typefully' },
      { status: 500 }
    );
  }
}

/**
 * POST: Perform full sync from Typefully to local database
 */
export async function POST() {
  try {
    const env = await loadEnv();
    const apiKey = env.TYPEFULLY_API_KEY;

    if (!apiKey || apiKey === 'your_typefully_api_key') {
      return NextResponse.json(
        { error: 'Typefully API key not configured. Add TYPEFULLY_API_KEY to .env' },
        { status: 400 }
      );
    }

    // Fetch all drafts from Typefully
    const drafts = await fetchTypefullyDrafts(apiKey);

    // Also try to get published items
    let published: TypefullyDraft[] = [];
    try {
      published = await fetchTypefullyPublished(apiKey);
    } catch {
      // Ignore - not all plans support this
    }

    // Combine and dedupe
    const allDrafts = [...drafts, ...published];
    const uniqueDrafts = Array.from(
      new Map(allDrafts.map(d => [d.id, d])).values()
    );

    // Sync to database
    const result = syncToDatabase(uniqueDrafts);

    return NextResponse.json({
      success: true,
      synced: result.updated,
      newlyPublished: result.published,
      typefullyDrafts: uniqueDrafts.length,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Typefully sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync with Typefully' },
      { status: 500 }
    );
  }
}
