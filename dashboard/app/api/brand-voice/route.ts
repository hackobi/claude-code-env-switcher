import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PROFILE_PATH = path.join(process.cwd(), '..', 'data', 'brand-voice-profile.json');

export async function GET() {
  try {
    const data = await fs.readFile(PROFILE_PATH, 'utf-8');
    const profile = JSON.parse(data);
    return NextResponse.json(profile);
  } catch (error) {
    // Return null if profile doesn't exist yet
    return NextResponse.json(null);
  }
}
