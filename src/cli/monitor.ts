#!/usr/bin/env node
import dotenv from 'dotenv';
import TwitterMonitor from '../integrations/twitter';
import LinearIntegration from '../integrations/linear';
import RelevanceScorer from '../content/relevance-scorer';

dotenv.config();

async function monitorTwitter() {
  console.log('🐦 Monitoring Crypto Twitter...\n');

  const monitor = new TwitterMonitor(process.env.TWITTER_BEARER_TOKEN!);
  const scorer = new RelevanceScorer();

  try {
    // Monitor influencers
    console.log('📊 Fetching tweets from crypto influencers...');
    const tweets = await monitor.monitorInfluencers(5);
    console.log(`  • Found ${tweets.length} tweets\n`);

    // Search for relevant tweets
    console.log('🔍 Searching for Demos-relevant tweets...');
    const searchTweets = await monitor.searchRelevantTweets(20);
    console.log(`  • Found ${searchTweets.length} search results\n`);

    // Combine and score
    const allTweets = [...tweets, ...searchTweets];
    const scored = allTweets.map(tweet => scorer.scoreTweet(tweet));
    const highQuality = scorer.filterHighQuality(scored, 0.6);

    console.log('═══════════════════════════════════════════');
    console.log(`🎯 HIGH-QUALITY OPPORTUNITIES (${highQuality.length})`);
    console.log('═══════════════════════════════════════════\n');

    highQuality.slice(0, 5).forEach((item, i) => {
      const tweet = item.content;
      console.log(`${i + 1}. Score: ${Math.round(item.score * 100)}% (${item.category})`);
      console.log(`   Text: "${tweet.text.substring(0, 100)}..."`);
      console.log(`   Engagement: ${monitor.calculateEngagementScore(tweet)} points`);
      console.log(`   URL: https://twitter.com/i/status/${tweet.id}`);
      console.log(`   Reasoning:`);
      item.reasoning.forEach(r => console.log(`     • ${r}`));
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function monitorLinear() {
  console.log('📋 Monitoring Linear Tasks...\n');

  const linear = new LinearIntegration(
    process.env.LINEAR_API_KEY!,
    process.env.LINEAR_TEAM_ID!
  );
  const scorer = new RelevanceScorer();

  try {
    // Get completed tasks
    console.log('✅ Fetching completed tasks (last 7 days)...');
    const completed = await linear.getCompletedTasks(7);
    console.log(`  • Found ${completed.length} completed tasks\n`);

    // Get shipped features
    console.log('🚀 Fetching shipped features (last 30 days)...');
    const shipped = await linear.getShippedFeatures(30);
    console.log(`  • Found ${shipped.length} shipped features\n`);

    // Get upcoming milestones
    console.log('🎯 Fetching upcoming milestones...');
    const milestones = await linear.getUpcomingMilestones();
    console.log(`  • Found ${milestones.length} milestones\n`);

    // Score tasks
    const scoredTasks = shipped.map(task => scorer.scoreLinearTask(task));
    const shippable = scoredTasks.filter(item => item.score >= 0.6);

    console.log('═══════════════════════════════════════════');
    console.log(`🚀 SHIPPABLE FEATURES (${shippable.length})`);
    console.log('═══════════════════════════════════════════\n');

    shippable.slice(0, 5).forEach((item, i) => {
      const task = item.content;
      console.log(`${i + 1}. Score: ${Math.round(item.score * 100)}% (${item.category})`);
      console.log(`   Title: ${task.title}`);
      console.log(`   Labels: ${task.labels.join(', ')}`);
      console.log(`   URL: ${task.url}`);
      console.log(`   Reasoning:`);
      item.reasoning.forEach(r => console.log(`     • ${r}`));
      console.log('');
    });

    if (milestones.length > 0) {
      console.log('═══════════════════════════════════════════');
      console.log('🗓️  UPCOMING MILESTONES');
      console.log('═══════════════════════════════════════════\n');

      milestones.slice(0, 3).forEach((milestone, i) => {
        console.log(`${i + 1}. ${milestone.name}`);
        console.log(`   Target: ${milestone.targetDate || 'TBD'}`);
        console.log(`   Progress: ${Math.round(milestone.progress * 100)}%`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  const command = process.argv[2];

  console.log('═══════════════════════════════════════════');
  console.log('📊 DEMOS MARKETING INTELLIGENCE MONITOR');
  console.log('═══════════════════════════════════════════\n');

  switch (command) {
    case 'twitter':
      await monitorTwitter();
      break;
    case 'linear':
      await monitorLinear();
      break;
    case 'all':
    default:
      await monitorTwitter();
      console.log('\n');
      await monitorLinear();
      break;
  }
}

main().catch(console.error);
