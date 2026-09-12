#!/usr/bin/env tsx

import { ContentDatabase } from '../src/database';
import path from 'path';

interface TweetAnalysis {
  totalTweets: number;
  processedTweets: number;
  unprocessedTweets: number;
  bySource: Record<string, number>;
  averageEngagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  recentTweets: any[];
}

interface ContentAnalysis {
  totalContent: number;
  byStatus: Record<string, number>;
  bySourceType: Record<string, number>;
  averageScores: {
    relevance: number;
    brand: number;
  };
}

async function main() {
  console.log('🔍 EXAMINING DEMOS MARKETING DATABASE');
  console.log('====================================\n');

  // Initialize database
  const dbPath = path.resolve(__dirname, '../data/marketing.db');
  console.log(`📂 Database path: ${dbPath}\n`);
  
  let db: ContentDatabase;
  try {
    db = new ContentDatabase(dbPath);
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  // Analyze tweets
  console.log('📊 TWEET ANALYSIS');
  console.log('------------------');
  
  const tweetAnalysis = analyzeTweets(db);
  printTweetAnalysis(tweetAnalysis);

  // Analyze generated content
  console.log('\n📝 GENERATED CONTENT ANALYSIS');
  console.log('------------------------------');
  
  const contentAnalysis = analyzeGeneratedContent(db);
  printContentAnalysis(contentAnalysis);

  // Show sample unprocessed tweets
  console.log('\n🐦 SAMPLE UNPROCESSED TWEETS');
  console.log('-----------------------------');
  
  showSampleUnprocessedTweets(db);

  // Show correlation analysis
  console.log('\n🔗 CONTENT GENERATION ANALYSIS');
  console.log('-------------------------------');
  
  analyzeContentGeneration(db);

  console.log('\n✅ Analysis complete!');
}

function analyzeTweets(db: ContentDatabase): TweetAnalysis {
  // Get all tweets with a custom query since we need more detailed analysis
  const allTweets = (db as any).db.prepare(`
    SELECT 
      id, text, author_id, author_username, created_at,
      like_count, retweet_count, reply_count, quote_count,
      source, relevance_score, processed, fetched_at
    FROM tweets 
    ORDER BY created_at DESC
  `).all();

  const processedCount = allTweets.filter((t: any) => t.processed).length;
  const unprocessedCount = allTweets.length - processedCount;

  // Analyze by source
  const bySource: Record<string, number> = {};
  allTweets.forEach((tweet: any) => {
    bySource[tweet.source] = (bySource[tweet.source] || 0) + 1;
  });

  // Calculate average engagement
  const totalEngagement = allTweets.reduce((acc: any, tweet: any) => ({
    likes: acc.likes + (tweet.like_count || 0),
    retweets: acc.retweets + (tweet.retweet_count || 0),
    replies: acc.replies + (tweet.reply_count || 0),
  }), { likes: 0, retweets: 0, replies: 0 });

  const averageEngagement = {
    likes: Math.round(totalEngagement.likes / allTweets.length || 0),
    retweets: Math.round(totalEngagement.retweets / allTweets.length || 0),
    replies: Math.round(totalEngagement.replies / allTweets.length || 0),
  };

  return {
    totalTweets: allTweets.length,
    processedTweets: processedCount,
    unprocessedTweets: unprocessedCount,
    bySource,
    averageEngagement,
    recentTweets: allTweets.slice(0, 10), // Most recent 10
  };
}

function analyzeGeneratedContent(db: ContentDatabase): ContentAnalysis {
  const allContent = (db as any).db.prepare(`
    SELECT 
      id, content_type, source_type, status,
      relevance_score, brand_score, created_at, source_id
    FROM generated_content 
    ORDER BY created_at DESC
  `).all();

  // Analyze by status
  const byStatus: Record<string, number> = {};
  allContent.forEach((content: any) => {
    byStatus[content.status] = (byStatus[content.status] || 0) + 1;
  });

  // Analyze by source type
  const bySourceType: Record<string, number> = {};
  allContent.forEach((content: any) => {
    bySourceType[content.source_type] = (bySourceType[content.source_type] || 0) + 1;
  });

  // Calculate average scores
  const avgRelevance = allContent.reduce((sum: number, c: any) => sum + (c.relevance_score || 0), 0) / allContent.length || 0;
  const avgBrand = allContent.reduce((sum: number, c: any) => sum + (c.brand_score || 0), 0) / allContent.length || 0;

  return {
    totalContent: allContent.length,
    byStatus,
    bySourceType,
    averageScores: {
      relevance: Math.round(avgRelevance * 100) / 100,
      brand: Math.round(avgBrand * 100) / 100,
    }
  };
}

function printTweetAnalysis(analysis: TweetAnalysis) {
  console.log(`Total tweets in database: ${analysis.totalTweets}`);
  console.log(`Processed tweets: ${analysis.processedTweets} (${Math.round(analysis.processedTweets / analysis.totalTweets * 100)}%)`);
  console.log(`Unprocessed tweets: ${analysis.unprocessedTweets} (${Math.round(analysis.unprocessedTweets / analysis.totalTweets * 100)}%)`);
  
  console.log('\nTweets by source:');
  Object.entries(analysis.bySource).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });

  console.log('\nAverage engagement:');
  console.log(`  Likes: ${analysis.averageEngagement.likes}`);
  console.log(`  Retweets: ${analysis.averageEngagement.retweets}`);
  console.log(`  Replies: ${analysis.averageEngagement.replies}`);
}

function printContentAnalysis(analysis: ContentAnalysis) {
  console.log(`Total generated content: ${analysis.totalContent}`);
  
  console.log('\nContent by status:');
  Object.entries(analysis.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nContent by source type:');
  Object.entries(analysis.bySourceType).forEach(([sourceType, count]) => {
    console.log(`  ${sourceType}: ${count}`);
  });

  console.log(`\nAverage scores:`);
  console.log(`  Relevance: ${analysis.averageScores.relevance}`);
  console.log(`  Brand: ${analysis.averageScores.brand}`);
}

function showSampleUnprocessedTweets(db: ContentDatabase) {
  const unprocessedTweets = db.getUnprocessedTweets(5); // Get 5 sample unprocessed tweets
  
  if (unprocessedTweets.length === 0) {
    console.log('No unprocessed tweets found in database.');
    return;
  }

  unprocessedTweets.forEach((tweet, index) => {
    console.log(`\n${index + 1}. Tweet ID: ${tweet.id}`);
    console.log(`   Author: ${tweet.author_username || tweet.author_id}`);
    console.log(`   Text: "${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}"`);
    console.log(`   Engagement: ${tweet.like_count}❤️ ${tweet.retweet_count}🔄 ${tweet.reply_count}💬`);
    console.log(`   Source: ${tweet.source}`);
    console.log(`   Created: ${tweet.created_at}`);
    if (tweet.relevance_score) {
      console.log(`   Relevance Score: ${tweet.relevance_score}`);
    }
  });
}

function analyzeContentGeneration(db: ContentDatabase) {
  // Check correlation between tweets and generated content
  const tweetSources = (db as any).db.prepare(`
    SELECT COUNT(*) as tweet_count, source FROM tweets GROUP BY source
  `).all();

  const generatedFromTweets = (db as any).db.prepare(`
    SELECT COUNT(*) as count FROM generated_content WHERE source_type = 'tweet'
  `).get()?.count || 0;

  const generatedFromTrends = (db as any).db.prepare(`
    SELECT COUNT(*) as count FROM generated_content WHERE source_type = 'trend'
  `).get()?.count || 0;

  const generatedFromTasks = (db as any).db.prepare(`
    SELECT COUNT(*) as count FROM generated_content WHERE source_type = 'linear_task'
  `).get()?.count || 0;

  console.log('Content generation efficiency:');
  console.log(`  Generated from tweets: ${generatedFromTweets}`);
  console.log(`  Generated from trends: ${generatedFromTrends}`);
  console.log(`  Generated from Linear tasks: ${generatedFromTasks}`);
  
  console.log('\nTweet collection vs usage:');
  tweetSources.forEach((source: any) => {
    console.log(`  ${source.source}: ${source.tweet_count} collected`);
  });

  // Get recent pipeline runs
  const recentRuns = (db as any).db.prepare(`
    SELECT * FROM pipeline_runs 
    ORDER BY started_at DESC 
    LIMIT 5
  `).all();

  if (recentRuns.length > 0) {
    console.log('\nRecent pipeline runs:');
    recentRuns.forEach((run: any, index: number) => {
      const duration = run.completed_at ? 
        Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000) : 
        'In progress';
      
      console.log(`  ${index + 1}. Started: ${run.started_at}`);
      console.log(`     Status: ${run.status}`);
      console.log(`     Duration: ${duration}s`);
      console.log(`     Tweets processed: ${run.tweets_processed}`);
      console.log(`     Drafts created: ${run.drafts_created}`);
      if (run.errors) {
        console.log(`     Errors: ${run.errors}`);
      }
      console.log('');
    });
  }
}

// Run the analysis
main().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});