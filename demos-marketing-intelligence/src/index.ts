import dotenv from 'dotenv';
import cron from 'node-cron';
import { ContentPipeline } from './workflows/content-pipeline';

dotenv.config();

// Validate environment variables
function validateEnv() {
  const required = [
    'TYPEFULLY_API_KEY',
    'LINEAR_API_KEY',
    'LINEAR_TEAM_ID',
    'OPENAI_API_KEY',
    'RAPIDAPI_KEY', // For Twitter API via RapidAPI (replaces native Twitter API)
  ];

  const optional = [
    'TWITTER_BEARER_TOKEN', // Optional: native Twitter API (RapidAPI used instead)
    'GOOGLE_API_KEY',       // Optional: for Imagen
  ];

  // Note: ANTHROPIC_API_KEY not needed - we use Claude CLI which handles auth

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   • ${key}`));
    process.exit(1);
  }

  // Log optional keys status
  const missingOptional = optional.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.log('ℹ️  Optional keys not set (features may be limited):');
    missingOptional.forEach(key => console.log(`   • ${key}`));
    console.log('');
  }
}

async function runPipeline() {
  try {
    const pipeline = new ContentPipeline(
      process.env.TYPEFULLY_API_KEY!,
      process.env.TWITTER_BEARER_TOKEN || '', // Optional: RapidAPI used instead
      process.env.LINEAR_API_KEY!,
      process.env.LINEAR_TEAM_ID!,
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY!, // Fallback to OpenAI
      process.env.OPENAI_API_KEY!,
      process.env.RAPIDAPI_KEY!,
      {
        maxDraftsPerRun: parseInt(process.env.MAX_DRAFTS_PER_DAY || '10'),
        minRelevanceScore: parseFloat(process.env.MIN_RELEVANCE_SCORE || '0.6'),
        enableTwitterMonitoring: process.env.MONITOR_CRYPTO_INFLUENCERS !== 'false',
        enableLinearIntegration: true,
        enableVisualGeneration: process.env.ENABLE_VISUAL_GENERATION !== 'false',
        enableBrandReview: process.env.ENABLE_BRAND_REVIEW !== 'false',
        enableBrandLearning: process.env.ENABLE_BRAND_LEARNING !== 'false',
        brandLearnFromParagraph: process.env.BRAND_LEARN_FROM_PARAGRAPH !== 'false',
        brandProfileUpdateHours: parseInt(process.env.BRAND_PROFILE_UPDATE_HOURS || '168'),
        dryRun: process.env.DRY_RUN === 'true',
      }
    );

    const result = await pipeline.run();

    if (result.errors.length > 0) {
      console.error('\n⚠️  Pipeline completed with errors:');
      result.errors.forEach(err => console.error(`  • ${err}`));
    }

    return result;
  } catch (error: any) {
    console.error('❌ Fatal pipeline error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯  DEMOS MARKETING INTELLIGENCE ENGINE');
  console.log('═══════════════════════════════════════════════════════\n');

  validateEnv();

  const intervalHours = parseInt(process.env.PIPELINE_INTERVAL_HOURS || '4');
  const cronExpression = `0 */${intervalHours} * * *`; // Every N hours

  console.log(`⏰ Scheduled to run every ${intervalHours} hours`);
  console.log(`📅 Cron: ${cronExpression}\n`);

  // Run immediately on startup
  console.log('🚀 Running initial pipeline...\n');
  await runPipeline();

  // Schedule recurring runs
  cron.schedule(cronExpression, async () => {
    console.log(`\n⏰ Scheduled run starting at ${new Date().toISOString()}`);
    await runPipeline();
  });

  console.log('\n✅ Pipeline is running. Press Ctrl+C to stop.\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Application error:', error);
    process.exit(1);
  });
}

export { runPipeline };
