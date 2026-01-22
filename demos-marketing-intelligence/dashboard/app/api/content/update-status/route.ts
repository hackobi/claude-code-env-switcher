import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');

type ContentStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'rejected';

export async function POST(request: Request) {
  try {
    const { id, status } = await request.json() as { id: string; status: ContentStatus };

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const validStatuses: ContentStatus[] = ['draft', 'review', 'scheduled', 'published', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check database exists
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const db = new Database(DB_PATH);

    // Update status in database
    const stmt = db.prepare('UPDATE generated_content SET status = ? WHERE id = ?');
    const result = stmt.run(status, parseInt(id));

    db.close();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error('Failed to update status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
