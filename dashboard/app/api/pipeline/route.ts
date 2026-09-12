import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface PipelineStatus {
  running: boolean;
  step: number;
  stepName: string;
  subStep?: string;
  progress?: number;
  error?: string;
  pid?: number;
}

// Global state for pipeline status (in production, use Redis or database)
let currentStatus: PipelineStatus = {
  running: false,
  step: 0,
  stepName: 'Idle',
};

// Store active process
let activeProcess: any = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body; // 'run' or 'dry-run'
    
    if (!mode || !['run', 'dry-run'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "run" or "dry-run"' },
        { status: 400 }
      );
    }

    // Check if pipeline is already running
    if (currentStatus.running) {
      return NextResponse.json(
        { error: 'Pipeline is already running' },
        { status: 409 }
      );
    }

    // Set initial status
    currentStatus = {
      running: true,
      step: 1,
      stepName: 'Initializing',
      subStep: 'Starting pipeline...',
      progress: 0,
    };

    // Spawn pipeline process
    const projectRoot = path.resolve(process.cwd(), '..');
    const npmScript = mode === 'dry-run' ? 'pipeline:dry' : 'pipeline';
    
    activeProcess = spawn('npm', ['run', npmScript], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DRY_RUN: mode === 'dry-run' ? 'true' : 'false'
      }
    });

    // Listen to stdout for status updates
    activeProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      parseStatusFromOutput(output);
    });

    activeProcess.stderr.on('data', (data: Buffer) => {
      const errorOutput = data.toString();
      console.error('Pipeline stderr:', errorOutput);
      
      currentStatus = {
        ...currentStatus,
        error: errorOutput,
      };
    });

    activeProcess.on('close', (code: number) => {
      if (code === 0) {
        currentStatus = {
          running: false,
          step: 5,
          stepName: 'Completed',
          subStep: 'Pipeline finished successfully',
          progress: 100,
        };
      } else {
        currentStatus = {
          running: false,
          step: 0,
          stepName: 'Failed',
          error: `Pipeline exited with code ${code}`,
          progress: 0,
        };
      }
      activeProcess = null;
    });

    activeProcess.on('error', (error: Error) => {
      currentStatus = {
        running: false,
        step: 0,
        stepName: 'Error',
        error: error.message,
        progress: 0,
      };
      activeProcess = null;
    });

    return NextResponse.json({ 
      success: true, 
      message: `Pipeline ${mode} started`,
      pid: activeProcess.pid,
      status: currentStatus
    });

  } catch (error) {
    console.error('Pipeline start error:', error);
    return NextResponse.json(
      { error: 'Failed to start pipeline' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: currentStatus });
}

// Parse pipeline status from console output
function parseStatusFromOutput(output: string): void {
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Step 1: Gathering content
    if (line.includes('📊 Step 1: Gathering content from sources')) {
      currentStatus = {
        ...currentStatus,
        step: 1,
        stepName: 'Gathering Content',
        subStep: 'Collecting from sources...',
        progress: 25,
      };
    }
    
    // Twitter trends
    if (line.includes('📈 Extracting trending topics from crypto Twitter')) {
      currentStatus = {
        ...currentStatus,
        subStep: 'Extracting trending topics from crypto Twitter...',
      };
    }
    
    // Influencer monitoring
    if (line.includes('🐦 Checking') && line.includes('influencers')) {
      const match = line.match(/🐦 Checking (\d+) influencers/);
      if (match) {
        currentStatus = {
          ...currentStatus,
          subStep: `Checking ${match[1]} influencers...`,
        };
      }
    }
    
    // Step 2: Scoring
    if (line.includes('🎯 Step 2: Scoring content relevance')) {
      currentStatus = {
        ...currentStatus,
        step: 2,
        stepName: 'Scoring Content',
        subStep: 'Analyzing relevance scores...',
        progress: 50,
      };
    }
    
    // Items meeting threshold
    if (line.includes('items meet quality threshold')) {
      const match = line.match(/(\d+) items meet quality threshold/);
      if (match) {
        currentStatus = {
          ...currentStatus,
          subStep: `${match[1]} items meet quality threshold`,
        };
      }
    }
    
    // Step 3: Generating content
    if (line.includes('✍️  Step 3: Generating original AI content')) {
      currentStatus = {
        ...currentStatus,
        step: 3,
        stepName: 'Generating Content',
        subStep: 'Creating AI content...',
        progress: 75,
      };
    }
    
    // AI Generator execution
    if (line.includes('[AIGenerator] Executing Claude CLI')) {
      currentStatus = {
        ...currentStatus,
        subStep: 'Executing Claude CLI for content generation...',
      };
    }
    
    // Generated content
    if (line.includes('Generated') && line.includes('original draft pieces')) {
      const match = line.match(/Generated (\d+) original draft pieces/);
      if (match) {
        currentStatus = {
          ...currentStatus,
          subStep: `Generated ${match[1]} original draft pieces`,
        };
      }
    }
    
    // Step 4: Sending to Typefully
    if (line.includes('📤 Step 4: Sending to Typefully')) {
      currentStatus = {
        ...currentStatus,
        step: 4,
        stepName: 'Sending to Typefully',
        subStep: 'Uploading drafts...',
        progress: 90,
      };
    }
    
    // Created drafts
    if (line.includes('Created') && line.includes('drafts in Typefully')) {
      const match = line.match(/Created (\d+) drafts in Typefully/);
      if (match) {
        currentStatus = {
          ...currentStatus,
          subStep: `Created ${match[1]} drafts in Typefully`,
        };
      }
    }
    
    // Dry run mode
    if (line.includes('🔍 Dry run mode - skipping Typefully upload')) {
      currentStatus = {
        ...currentStatus,
        step: 4,
        stepName: 'Dry Run Complete',
        subStep: 'Skipped Typefully upload (dry run)',
        progress: 95,
      };
    }
    
    // Pipeline completed
    if (line.includes('✅ Pipeline completed successfully')) {
      currentStatus = {
        ...currentStatus,
        step: 5,
        stepName: 'Completed',
        subStep: 'Pipeline finished successfully',
        progress: 100,
      };
    }
    
    // Error detection
    if (line.includes('❌') || line.includes('error:') || line.includes('failed:')) {
      currentStatus = {
        ...currentStatus,
        error: line.replace(/❌\s*/, ''),
      };
    }
  }
}