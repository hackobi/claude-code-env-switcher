import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - shared with main marketing intelligence engine
const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');

// Brand score threshold - content must reach this to pass review
const BRAND_SCORE_THRESHOLD = 60;

interface ContentItem {
  id: string;
  type: 'tweet' | 'thread' | 'article' | 'announcement';
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'rejected';
  content: string;
  threadParts?: string[];
  articleBody?: string;
  source: 'linear' | 'trend' | 'sdk-update' | 'manual' | 'tweet' | 'linear_task' | 'milestone';
  brandScore?: number;
  createdAt: string;
  scheduledFor?: string;
  typefullyId?: string;
  paragraphId?: string;
  /** Final image with overlay (logo + tagline) */
  imageUrl?: string;
  /** Base image without overlay - used for re-applying different taglines */
  baseImageUrl?: string;
  relevanceScore?: number;
  sourceText?: string;
  /** Full context JSON with sample tweets, reasoning, etc. */
  sourceContext?: {
    type: string;
    topic?: string;
    sampleTweets?: string[];
    relevanceToWeb3?: string;
    reasoning?: string;
    taskTitle?: string;
    taskDescription?: string;
    taskLabels?: string[];
  };
}

interface GeneratedContentRecord {
  id: number;
  content: string;
  content_type: string;
  source_type: string;
  source_id: string | null;
  source_text: string | null;
  source_context: string | null;
  relevance_score: number;
  brand_score: number;
  status: string;
  typefully_id: string | null;
  image_path: string | null;
  /** Base image without overlay - used for re-applying different taglines */
  base_image_path: string | null;
  created_at: string;
  scheduled_for: string | null;
  published_at: string | null;
}

function getDatabase(): Database.Database | null {
  if (!fs.existsSync(DB_PATH)) {
    console.log('Database not found at:', DB_PATH);
    return null;
  }

  try {
    const db = new Database(DB_PATH, { readonly: true });
    return db;
  } catch (error) {
    console.error('Failed to open database:', error);
    return null;
  }
}

function mapStatusToKanban(dbStatus: string, brandScore: number, threshold: number): ContentItem['status'] {
  // Map database status to kanban column
  // Content with brand score >= threshold goes to review, otherwise stays in draft
  const statusMap: Record<string, ContentItem['status']> = {
    'draft': brandScore >= threshold ? 'review' : 'draft',
    'review': 'review',
    'approved': 'review',
    'scheduled': 'scheduled',
    'published': 'published',
    'rejected': 'rejected', // Rejected items stay in rejected column
  };
  return statusMap[dbStatus] || 'draft';
}

function mapSourceType(sourceType: string): ContentItem['source'] {
  const sourceMap: Record<string, ContentItem['source']> = {
    'tweet': 'trend',
    'linear_task': 'linear',
    'trend': 'trend',
    'milestone': 'sdk-update',
    'manual': 'manual',
  };
  return sourceMap[sourceType] || 'manual';
}

function recordToContentItem(record: GeneratedContentRecord, threshold: number): ContentItem {
  const isThread = record.content_type === 'thread' || record.content.includes('\n\n');
  const brandScore = Math.round(record.brand_score * 100);

  let threadParts: string[] | undefined;
  if (isThread) {
    threadParts = record.content.split('\n\n').filter(p => p.trim());
  }

  return {
    id: record.id.toString(),
    type: record.content_type as ContentItem['type'],
    status: mapStatusToKanban(record.status, brandScore, threshold),
    content: isThread ? threadParts![0] : record.content,
    threadParts: isThread ? threadParts : undefined,
    source: mapSourceType(record.source_type),
    brandScore,
    relevanceScore: Math.round(record.relevance_score * 100),
    createdAt: record.created_at,
    scheduledFor: record.scheduled_for || undefined,
    typefullyId: record.typefully_id || undefined,
    imageUrl: record.image_path || undefined,
    baseImageUrl: record.base_image_path || undefined,
    sourceText: record.source_text || undefined,
    sourceContext: record.source_context ? JSON.parse(record.source_context) : undefined,
  };
}

export async function GET(request: Request) {
  try {
    // Get threshold from query params
    const url = new URL(request.url);
    const thresholdParam = url.searchParams.get('threshold');
    const threshold = thresholdParam ? parseInt(thresholdParam) : BRAND_SCORE_THRESHOLD;

    const db = getDatabase();

    if (!db) {
      // Fall back to sample data if database doesn't exist
      console.log('Using sample data (database not available)');
      return NextResponse.json({
        items: [
          {
            id: '1',
            type: 'tweet',
            status: 'draft',
            content: 'Cross-chain identity is the foundation of Web3. Here\'s why Demos CCI changes everything.',
            source: 'trend',
            brandScore: 75, // Below threshold, stays in draft
            createdAt: new Date().toISOString(),
          },
        ],
        stats: {
          tweets: 0,
          tasks: 0,
          generated: 0,
          pipelineRuns: 0,
        },
      });
    }

    // Get generated content from database
    const records = db.prepare(`
      SELECT * FROM generated_content
      ORDER BY created_at DESC
      LIMIT 200
    `).all() as GeneratedContentRecord[];

    // Get stats
    const stats = {
      tweets: (db.prepare('SELECT COUNT(*) as count FROM tweets').get() as any)?.count || 0,
      tasks: (db.prepare('SELECT COUNT(*) as count FROM linear_tasks').get() as any)?.count || 0,
      generated: (db.prepare('SELECT COUNT(*) as count FROM generated_content').get() as any)?.count || 0,
      pipelineRuns: (db.prepare('SELECT COUNT(*) as count FROM pipeline_runs').get() as any)?.count || 0,
    };

    // Get status breakdown
    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM generated_content
      GROUP BY status
    `).all() as { status: string; count: number }[];

    db.close();

    const items = records.map(record => recordToContentItem(record, threshold));

    return NextResponse.json({
      items,
      stats,
      statusBreakdown: Object.fromEntries(statusBreakdown.map(s => [s.status, s.count])),
    });
  } catch (error) {
    console.error('Failed to load content items:', error);
    return NextResponse.json({ error: 'Failed to load content items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newItem: ContentItem = await request.json();

    const dbPath = path.join(process.cwd(), '..', 'data', 'marketing.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const db = new Database(dbPath);

    const stmt = db.prepare(`
      INSERT INTO generated_content
      (content, content_type, source_type, source_id, source_text, relevance_score, brand_score, status, image_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const content = newItem.threadParts
      ? newItem.threadParts.join('\n\n')
      : newItem.content;

    const result = stmt.run(
      content,
      newItem.type || 'tweet',
      newItem.source || 'manual',
      null,
      newItem.sourceText || null,
      (newItem.relevanceScore || 0) / 100,
      (newItem.brandScore || 0) / 100,
      'draft',
      newItem.imageUrl || null
    );

    db.close();

    return NextResponse.json({
      success: true,
      item: { ...newItem, id: result.lastInsertRowid.toString() }
    });
  } catch (error) {
    console.error('Failed to create content item:', error);
    return NextResponse.json({ error: 'Failed to create content item' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedItem: ContentItem = await request.json();

    const dbPath = path.join(process.cwd(), '..', 'data', 'marketing.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const db = new Database(dbPath);

    // Status is stored directly (no 'idea' status anymore)
    const dbStatus = updatedItem.status;

    const content = updatedItem.threadParts
      ? updatedItem.threadParts.join('\n\n')
      : updatedItem.content;

    const stmt = db.prepare(`
      UPDATE generated_content
      SET content = ?, content_type = ?, status = ?, brand_score = ?, scheduled_for = ?, typefully_id = ?, image_path = ?
      WHERE id = ?
    `);

    stmt.run(
      content,
      updatedItem.type || 'tweet',
      dbStatus,
      (updatedItem.brandScore || 0) / 100,
      updatedItem.scheduledFor || null,
      updatedItem.typefullyId || null,
      updatedItem.imageUrl || null,
      parseInt(updatedItem.id)
    );

    db.close();

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error('Failed to update content item:', error);
    return NextResponse.json({ error: 'Failed to update content item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    const dbPath = path.join(process.cwd(), '..', 'data', 'marketing.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const db = new Database(dbPath);

    const result = db.prepare('DELETE FROM generated_content WHERE id = ?').run(parseInt(id));

    db.close();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete content item:', error);
    return NextResponse.json({ error: 'Failed to delete content item' }, { status: 500 });
  }
}
