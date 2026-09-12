import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Import Ideas API
 * Triggers the full content pipeline to:
 * 1. Monitor Twitter for trending crypto topics
 * 2. Check Linear for completed tasks
 * 3. Generate original content based on trends
 * 4. Store drafts in the database
 */
export async function POST() {
  try {
    console.log('[ImportIdeas] Starting full content pipeline...');

    // Run the main pipeline (src/index.ts exports runPipeline)
    const projectRoot = path.join(process.cwd(), '..');
    const result = await runContentPipeline(projectRoot);

    return NextResponse.json({
      success: true,
      message: 'Content pipeline completed',
      ...result,
    });
  } catch (error) {
    console.error('[ImportIdeas] Failed to import ideas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import ideas' },
      { status: 500 }
    );
  }
}

async function runContentPipeline(projectRoot: string): Promise<{
  draftsCreated: number;
  itemsProcessed: number;
  errors: string[];
  output: string;
}> {
  return new Promise((resolve, reject) => {
    // Run a script that imports and calls the pipeline
    const scriptContent = `
      const dotenv = require('dotenv');
      dotenv.config();

      const { ContentPipeline } = require('./src/workflows/content-pipeline');

      async function run() {
        const pipeline = new ContentPipeline(
          process.env.TYPEFULLY_API_KEY,
          process.env.TWITTER_BEARER_TOKEN || '',
          process.env.LINEAR_API_KEY,
          process.env.LINEAR_TEAM_ID,
          process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
          process.env.OPENAI_API_KEY,
          process.env.RAPIDAPI_KEY,
          {
            maxDraftsPerRun: 10,
            minRelevanceScore: 0.5,
            enableTwitterMonitoring: true,
            enableLinearIntegration: true,
            enableVisualGeneration: false,
            enableBrandReview: true,
            enableBrandLearning: false,
            dryRun: true,  // Don't send to Typefully from pipeline - use dashboard scheduling instead
            useDatabase: true,
          }
        );

        const result = await pipeline.run();
        console.log(JSON.stringify(result));
      }

      run().catch(err => {
        console.error('Pipeline error:', err.message);
        process.exit(1);
      });
    `;

    const child = spawn('npx', ['tsx', '-e', scriptContent], {
      cwd: projectRoot,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log('[Pipeline]', data.toString().trim());
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      // Don't log every stderr line as error - could be warnings
      console.log('[Pipeline]', data.toString().trim());
    });

    child.on('close', (code) => {
      // Try to parse the JSON result from the last line
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      try {
        const result = JSON.parse(lastLine);
        resolve({
          draftsCreated: result.draftsCreated || 0,
          itemsProcessed: result.itemsProcessed || 0,
          errors: result.errors || [],
          output: stdout,
        });
      } catch {
        // Couldn't parse JSON, extract stats from output
        const draftsMatch = stdout.match(/Created (\d+) drafts/);
        const itemsMatch = stdout.match(/Found (\d+) trending topics/);

        if (code === 0) {
          resolve({
            draftsCreated: draftsMatch ? parseInt(draftsMatch[1]) : 0,
            itemsProcessed: itemsMatch ? parseInt(itemsMatch[1]) : 0,
            errors: [],
            output: stdout,
          });
        } else {
          reject(new Error(`Pipeline exited with code ${code}: ${stderr || stdout}`));
        }
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Timeout after 5 minutes (pipeline can take a while with API calls)
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Pipeline timed out after 5 minutes'));
    }, 300000);
  });
}
