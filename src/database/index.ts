import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface TweetRecord {
  id: string;
  text: string;
  author_id: string;
  author_username?: string | null;
  created_at: string;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  impression_count?: number | null;
  source: 'influencer' | 'search' | 'demos';
  relevance_score?: number | null;
  processed: boolean;
  fetched_at: string;
}

export interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  published_at: string;
  source: 'paragraph' | 'blog' | 'docs';
  url?: string;
  fetched_at: string;
}

export interface GeneratedContentRecord {
  id: number;
  content: string;
  content_type: 'tweet' | 'thread' | 'article' | 'announcement';
  source_type: 'tweet' | 'linear_task' | 'trend' | 'milestone' | 'manual';
  source_id?: string;
  source_text?: string;
  /** Full context JSON: sample tweets, relevance reasoning, etc. for editing reference */
  source_context?: string;
  relevance_score: number;
  brand_score: number;
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'rejected';
  typefully_id?: string;
  /** Final image with overlay (logo + tagline) */
  image_path?: string;
  /** Base image without overlay - used for re-applying different taglines */
  base_image_path?: string;
  created_at: string;
  scheduled_for?: string;
  published_at?: string;
}

export interface LinearTaskRecord {
  id: string;
  title: string;
  description?: string | null;
  state: string;
  labels: string;
  url?: string | null;
  completed_at?: string | null;
  fetched_at: string;
  processed: boolean;
}

/**
 * SQLite database for marketing intelligence content history
 */
export class ContentDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath = './data/marketing.db') {
    this.dbPath = dbPath;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
    this.runMigrations();
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      -- Tweets table (from Twitter/X monitoring)
      CREATE TABLE IF NOT EXISTS tweets (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        author_id TEXT,
        author_username TEXT,
        created_at TEXT,
        like_count INTEGER DEFAULT 0,
        retweet_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        quote_count INTEGER DEFAULT 0,
        impression_count INTEGER,
        source TEXT NOT NULL,
        relevance_score REAL,
        processed INTEGER DEFAULT 0,
        fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Articles table (from Paragraph, blog, etc.)
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        content TEXT,
        excerpt TEXT,
        author TEXT,
        published_at TEXT,
        source TEXT NOT NULL,
        url TEXT,
        fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Linear tasks table
      CREATE TABLE IF NOT EXISTS linear_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        state TEXT,
        labels TEXT,
        url TEXT,
        completed_at TEXT,
        fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
        processed INTEGER DEFAULT 0
      );

      -- Generated content table
      CREATE TABLE IF NOT EXISTS generated_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        source_text TEXT,
        source_context TEXT,
        relevance_score REAL DEFAULT 0,
        brand_score REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        typefully_id TEXT,
        image_path TEXT,
        base_image_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        scheduled_for TEXT,
        published_at TEXT
      );

      -- Content hash table for deduplication
      CREATE TABLE IF NOT EXISTS content_hashes (
        hash TEXT PRIMARY KEY,
        content_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (content_id) REFERENCES generated_content(id)
      );

      -- Pipeline runs table for metrics
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        tweets_processed INTEGER DEFAULT 0,
        tasks_processed INTEGER DEFAULT 0,
        drafts_created INTEGER DEFAULT 0,
        errors TEXT,
        status TEXT DEFAULT 'running'
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_tweets_source ON tweets(source);
      CREATE INDEX IF NOT EXISTS idx_tweets_created ON tweets(created_at);
      CREATE INDEX IF NOT EXISTS idx_tweets_processed ON tweets(processed);
      CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
      CREATE INDEX IF NOT EXISTS idx_generated_status ON generated_content(status);
      CREATE INDEX IF NOT EXISTS idx_generated_source ON generated_content(source_type);
      CREATE INDEX IF NOT EXISTS idx_linear_processed ON linear_tasks(processed);
    `);

    console.log(`✓ Database initialized at ${this.dbPath}`);
  }

  /**
   * Run database migrations for schema updates
   */
  private runMigrations(): void {
    // Migration: Add base_image_path column if it doesn't exist
    try {
      const columns = this.db.prepare("PRAGMA table_info(generated_content)").all() as { name: string }[];
      const hasBaseImagePath = columns.some(col => col.name === 'base_image_path');

      if (!hasBaseImagePath) {
        this.db.exec('ALTER TABLE generated_content ADD COLUMN base_image_path TEXT');
        console.log('✓ Migration: Added base_image_path column');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  // ==================== TWEETS ====================

  /**
   * Insert or update a tweet
   */
  insertTweet(tweet: Omit<TweetRecord, 'fetched_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tweets
      (id, text, author_id, author_username, created_at, like_count, retweet_count,
       reply_count, quote_count, impression_count, source, relevance_score, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // SQLite only accepts null, not undefined - coerce all optional values
    stmt.run(
      tweet.id,
      tweet.text,
      tweet.author_id,
      tweet.author_username ?? null,
      tweet.created_at,
      tweet.like_count ?? 0,
      tweet.retweet_count ?? 0,
      tweet.reply_count ?? 0,
      tweet.quote_count ?? 0,
      tweet.impression_count ?? null,
      tweet.source,
      tweet.relevance_score ?? null,
      tweet.processed ? 1 : 0
    );
  }

  /**
   * Bulk insert tweets
   */
  insertTweets(tweets: Omit<TweetRecord, 'fetched_at'>[]): number {
    const insert = this.db.transaction((items: Omit<TweetRecord, 'fetched_at'>[]) => {
      let count = 0;
      for (const tweet of items) {
        this.insertTweet(tweet);
        count++;
      }
      return count;
    });

    return insert(tweets);
  }

  /**
   * Get unprocessed tweets
   */
  getUnprocessedTweets(limit = 100): TweetRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tweets
      WHERE processed = 0
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as TweetRecord[];
  }

  /**
   * Mark tweet as processed
   */
  markTweetProcessed(id: string): void {
    const stmt = this.db.prepare('UPDATE tweets SET processed = 1 WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Check if tweet exists
   */
  tweetExists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM tweets WHERE id = ?');
    return !!stmt.get(id);
  }

  /**
   * Get recent tweets by source
   */
  getRecentTweets(source: string, days = 7, limit = 100): TweetRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tweets
      WHERE source = ?
      AND datetime(created_at) > datetime('now', '-' || ? || ' days')
      ORDER BY like_count DESC
      LIMIT ?
    `);
    return stmt.all(source, days, limit) as TweetRecord[];
  }

  // ==================== ARTICLES ====================

  /**
   * Insert or update an article
   */
  insertArticle(article: Omit<ArticleRecord, 'fetched_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO articles
      (id, title, slug, content, excerpt, author, published_at, source, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      article.id,
      article.title,
      article.slug,
      article.content,
      article.excerpt,
      article.author,
      article.published_at,
      article.source,
      article.url
    );
  }

  /**
   * Get all articles
   */
  getArticles(source?: string, limit = 50): ArticleRecord[] {
    if (source) {
      const stmt = this.db.prepare(`
        SELECT * FROM articles
        WHERE source = ?
        ORDER BY published_at DESC
        LIMIT ?
      `);
      return stmt.all(source, limit) as ArticleRecord[];
    }

    const stmt = this.db.prepare(`
      SELECT * FROM articles
      ORDER BY published_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as ArticleRecord[];
  }

  /**
   * Check if article exists
   */
  articleExists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM articles WHERE id = ?');
    return !!stmt.get(id);
  }

  // ==================== LINEAR TASKS ====================

  /**
   * Insert or update a Linear task
   */
  insertLinearTask(task: Omit<LinearTaskRecord, 'fetched_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO linear_tasks
      (id, title, description, state, labels, url, completed_at, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // SQLite only accepts null, not undefined - coerce all optional values
    stmt.run(
      task.id,
      task.title,
      task.description ?? null,
      task.state,
      task.labels ?? '',
      task.url ?? null,
      task.completed_at ?? null,
      task.processed ? 1 : 0
    );
  }

  /**
   * Get unprocessed Linear tasks
   */
  getUnprocessedTasks(limit = 50): LinearTaskRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM linear_tasks
      WHERE processed = 0
      ORDER BY completed_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as LinearTaskRecord[];
  }

  /**
   * Mark task as processed
   */
  markTaskProcessed(id: string): void {
    const stmt = this.db.prepare('UPDATE linear_tasks SET processed = 1 WHERE id = ?');
    stmt.run(id);
  }

  // ==================== GENERATED CONTENT ====================

  /**
   * Check if content already exists for a given source
   * Prevents duplicate content generation for the same trigger
   */
  hasContentForSource(sourceType: string, sourceId: string): boolean {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM generated_content WHERE source_type = ? AND source_id = ?'
    );
    const result = stmt.get(sourceType, sourceId) as { count: number };
    return result.count > 0;
  }

  /**
   * Insert generated content
   */
  insertGeneratedContent(content: Omit<GeneratedContentRecord, 'id' | 'created_at'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO generated_content
      (content, content_type, source_type, source_id, source_text, source_context,
       relevance_score, brand_score, status, typefully_id, image_path, scheduled_for)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      content.content,
      content.content_type,
      content.source_type,
      content.source_id,
      content.source_text,
      content.source_context,
      content.relevance_score,
      content.brand_score,
      content.status,
      content.typefully_id,
      content.image_path,
      content.scheduled_for
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Update content status
   */
  updateContentStatus(id: number, status: GeneratedContentRecord['status']): void {
    const stmt = this.db.prepare('UPDATE generated_content SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  /**
   * Set Typefully ID for content
   */
  setTypefullyId(id: number, typefullyId: string): void {
    const stmt = this.db.prepare('UPDATE generated_content SET typefully_id = ? WHERE id = ?');
    stmt.run(typefullyId, id);
  }

  /**
   * Get content by status
   */
  getContentByStatus(status: GeneratedContentRecord['status'], limit = 50): GeneratedContentRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM generated_content
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(status, limit) as GeneratedContentRecord[];
  }

  /**
   * Get recent generated content
   */
  getRecentContent(days = 7, limit = 100): GeneratedContentRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM generated_content
      WHERE datetime(created_at) > datetime('now', '-' || ? || ' days')
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(days, limit) as GeneratedContentRecord[];
  }

  // ==================== DEDUPLICATION ====================

  /**
   * Generate content hash for deduplication
   */
  private hashContent(content: string): string {
    // Simple hash - normalize and create fingerprint
    const normalized = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Check if similar content exists
   */
  isDuplicateContent(content: string): boolean {
    const hash = this.hashContent(content);
    const stmt = this.db.prepare('SELECT 1 FROM content_hashes WHERE hash = ?');
    return !!stmt.get(hash);
  }

  /**
   * Register content hash
   */
  registerContentHash(content: string, contentId: number): void {
    const hash = this.hashContent(content);
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO content_hashes (hash, content_id) VALUES (?, ?)
    `);
    stmt.run(hash, contentId);
  }

  // ==================== PIPELINE RUNS ====================

  /**
   * Start a pipeline run
   */
  startPipelineRun(): number {
    const stmt = this.db.prepare('INSERT INTO pipeline_runs DEFAULT VALUES');
    const result = stmt.run();
    return result.lastInsertRowid as number;
  }

  /**
   * Complete a pipeline run
   */
  completePipelineRun(
    id: number,
    stats: { tweets: number; tasks: number; drafts: number; errors?: string[] }
  ): void {
    const stmt = this.db.prepare(`
      UPDATE pipeline_runs
      SET completed_at = CURRENT_TIMESTAMP,
          tweets_processed = ?,
          tasks_processed = ?,
          drafts_created = ?,
          errors = ?,
          status = 'completed'
      WHERE id = ?
    `);

    stmt.run(
      stats.tweets,
      stats.tasks,
      stats.drafts,
      stats.errors ? JSON.stringify(stats.errors) : null,
      id
    );
  }

  /**
   * Get recent pipeline runs
   */
  getRecentRuns(limit = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pipeline_runs
      ORDER BY started_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // ==================== STATS ====================

  /**
   * Get database statistics
   */
  getStats(): {
    tweets: number;
    articles: number;
    tasks: number;
    generated: number;
    byStatus: Record<string, number>;
  } {
    const tweets = (this.db.prepare('SELECT COUNT(*) as count FROM tweets').get() as any).count;
    const articles = (this.db.prepare('SELECT COUNT(*) as count FROM articles').get() as any).count;
    const tasks = (this.db.prepare('SELECT COUNT(*) as count FROM linear_tasks').get() as any).count;
    const generated = (this.db.prepare('SELECT COUNT(*) as count FROM generated_content').get() as any).count;

    const statusCounts = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM generated_content
      GROUP BY status
    `).all() as { status: string; count: number }[];

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = row.count;
    }

    return { tweets, articles, tasks, generated, byStatus };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Export singleton for easy use
let dbInstance: ContentDatabase | null = null;

export function getDatabase(dbPath?: string): ContentDatabase {
  if (!dbInstance) {
    dbInstance = new ContentDatabase(dbPath);
  }
  return dbInstance;
}

export default ContentDatabase;
