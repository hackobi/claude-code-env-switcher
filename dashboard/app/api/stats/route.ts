import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');

interface PipelineRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  tweets_processed: number;
  tasks_processed: number;
  drafts_created: number;
  errors: string | null;
  status: string;
}

export async function GET() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({
        error: 'Database not available',
        stats: null,
        recentRuns: [],
      });
    }

    const db = new Database(DB_PATH, { readonly: true });

    // Get overall stats
    const stats = {
      tweets: (db.prepare('SELECT COUNT(*) as count FROM tweets').get() as any)?.count || 0,
      tweetsProcessed: (db.prepare('SELECT COUNT(*) as count FROM tweets WHERE processed = 1').get() as any)?.count || 0,
      tasks: (db.prepare('SELECT COUNT(*) as count FROM linear_tasks').get() as any)?.count || 0,
      tasksProcessed: (db.prepare('SELECT COUNT(*) as count FROM linear_tasks WHERE processed = 1').get() as any)?.count || 0,
      articles: (db.prepare('SELECT COUNT(*) as count FROM articles').get() as any)?.count || 0,
      generated: (db.prepare('SELECT COUNT(*) as count FROM generated_content').get() as any)?.count || 0,
      pipelineRuns: (db.prepare('SELECT COUNT(*) as count FROM pipeline_runs').get() as any)?.count || 0,
    };

    // Get status breakdown
    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM generated_content
      GROUP BY status
    `).all() as { status: string; count: number }[];

    // Get source type breakdown
    const sourceBreakdown = db.prepare(`
      SELECT source_type, COUNT(*) as count
      FROM generated_content
      GROUP BY source_type
    `).all() as { source_type: string; count: number }[];

    // Get tweet source breakdown
    const tweetSourceBreakdown = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM tweets
      GROUP BY source
    `).all() as { source: string; count: number }[];

    // Get recent pipeline runs
    const recentRuns = db.prepare(`
      SELECT * FROM pipeline_runs
      ORDER BY started_at DESC
      LIMIT 10
    `).all() as PipelineRun[];

    // Get content created in last 24 hours
    const last24h = {
      tweets: (db.prepare(`
        SELECT COUNT(*) as count FROM tweets
        WHERE datetime(fetched_at) > datetime('now', '-1 day')
      `).get() as any)?.count || 0,
      generated: (db.prepare(`
        SELECT COUNT(*) as count FROM generated_content
        WHERE datetime(created_at) > datetime('now', '-1 day')
      `).get() as any)?.count || 0,
      pipelineRuns: (db.prepare(`
        SELECT COUNT(*) as count FROM pipeline_runs
        WHERE datetime(started_at) > datetime('now', '-1 day')
      `).get() as any)?.count || 0,
    };

    // Get top performing content (highest brand scores)
    const topContent = db.prepare(`
      SELECT content, brand_score, relevance_score, source_type, created_at
      FROM generated_content
      WHERE brand_score > 0
      ORDER BY brand_score DESC
      LIMIT 5
    `).all() as any[];

    db.close();

    return NextResponse.json({
      stats,
      last24h,
      statusBreakdown: Object.fromEntries(statusBreakdown.map(s => [s.status, s.count])),
      sourceBreakdown: Object.fromEntries(sourceBreakdown.map(s => [s.source_type, s.count])),
      tweetSourceBreakdown: Object.fromEntries(tweetSourceBreakdown.map(s => [s.source, s.count])),
      recentRuns: recentRuns.map(run => ({
        ...run,
        errors: run.errors ? JSON.parse(run.errors) : null,
      })),
      topContent: topContent.map(c => ({
        ...c,
        content: c.content.substring(0, 100) + (c.content.length > 100 ? '...' : ''),
      })),
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
