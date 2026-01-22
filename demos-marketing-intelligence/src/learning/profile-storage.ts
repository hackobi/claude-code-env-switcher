import fs from 'fs/promises';
import path from 'path';
import { BrandVoiceProfile } from './brand-voice-learner';

/**
 * Manages persistence of learned brand voice profiles
 */
export class ProfileStorage {
  private storageDir: string;
  private profileFile: string;

  constructor(storageDir = './data') {
    this.storageDir = storageDir;
    this.profileFile = path.join(storageDir, 'brand-voice-profile.json');
  }

  /**
   * Save profile to disk
   */
  async save(profile: BrandVoiceProfile): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Write profile
      await fs.writeFile(
        this.profileFile,
        JSON.stringify(profile, null, 2),
        'utf-8'
      );

      console.log(`✓ Saved brand voice profile to ${this.profileFile}`);
    } catch (error: any) {
      console.error('Failed to save profile:', error.message);
      throw error;
    }
  }

  /**
   * Load profile from disk
   */
  async load(): Promise<BrandVoiceProfile | null> {
    try {
      const data = await fs.readFile(this.profileFile, 'utf-8');
      const profile = JSON.parse(data) as BrandVoiceProfile;

      console.log(`✓ Loaded brand voice profile (${profile.samplesAnalyzed} samples, updated ${new Date(profile.lastUpdated).toLocaleDateString()})`);

      return profile;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('No existing profile found');
        return null;
      }

      console.error('Failed to load profile:', error.message);
      return null;
    }
  }

  /**
   * Check if profile exists and is recent
   */
  async isProfileFresh(maxAgeHours = 168): Promise<boolean> {
    const profile = await this.load();

    if (!profile) {
      return false;
    }

    const ageMs = Date.now() - new Date(profile.lastUpdated).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    return ageHours < maxAgeHours;
  }

  /**
   * Get profile age in hours
   */
  async getProfileAge(): Promise<number | null> {
    const profile = await this.load();

    if (!profile) {
      return null;
    }

    const ageMs = Date.now() - new Date(profile.lastUpdated).getTime();
    return ageMs / (1000 * 60 * 60);
  }

  /**
   * Export profile as text guidelines
   */
  async exportAsText(profile: BrandVoiceProfile): Promise<string> {
    const textPath = path.join(this.storageDir, 'brand-voice-guidelines.txt');

    // Generate human-readable text
    const text = this.formatAsText(profile);

    // Save to file
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.writeFile(textPath, text, 'utf-8');

    console.log(`✓ Exported guidelines to ${textPath}`);

    return textPath;
  }

  /**
   * Format profile as readable text
   */
  private formatAsText(profile: BrandVoiceProfile): string {
    return `DEMOS NETWORK BRAND VOICE GUIDELINES
Generated: ${new Date(profile.lastUpdated).toLocaleString()}
Based on ${profile.samplesAnalyzed} analyzed tweets from @DemosNetwork

═══════════════════════════════════════════════════════

VOICE CHARACTERISTICS

Tone: ${profile.voiceCharacteristics.tone.join(', ')}

Metrics:
- Technical Level: ${Math.round(profile.voiceCharacteristics.technicalLevel * 100)}%
- Casualness: ${Math.round(profile.voiceCharacteristics.casualness * 100)}%
- Enthusiasm: ${Math.round(profile.voiceCharacteristics.enthusiasm * 100)}%

Common Phrases (Use These):
${profile.voiceCharacteristics.commonPhrases.map(p => `  • "${p}"`).join('\n')}

Avoided Phrases (Don't Use):
${profile.voiceCharacteristics.avoidedPhrases.map(p => `  • "${p}"`).join('\n')}

═══════════════════════════════════════════════════════

TOPIC PATTERNS

Shipping Announcements:
${profile.topicPatterns.shippingAnnouncements.map(p => `  • ${p}`).join('\n')}

Technical Explanations:
${profile.topicPatterns.technicalExplanations.map(p => `  • ${p}`).join('\n')}

Community Engagement:
${profile.topicPatterns.communityEngagement.map(p => `  • ${p}`).join('\n')}

═══════════════════════════════════════════════════════

STRUCTURAL PATTERNS

- Average Tweet Length: ${profile.structuralPatterns.averageTweetLength} characters
- Thread Usage: ${Math.round(profile.structuralPatterns.threadUsage * 100)}% of posts
- Emoji Usage: ${profile.structuralPatterns.emojiUsage.toFixed(1)} per tweet
- Hashtag Usage: ${profile.structuralPatterns.hashtagUsage.toFixed(1)} per tweet

═══════════════════════════════════════════════════════

EXCELLENT EXAMPLES (Learn From These)

${profile.exampleTweets.excellent.map((tweet, i) => `${i + 1}. "${tweet}"`).join('\n\n')}

═══════════════════════════════════════════════════════

GOOD EXAMPLES (Showing Variety)

${profile.exampleTweets.good.map((tweet, i) => `${i + 1}. "${tweet}"`).join('\n\n')}

═══════════════════════════════════════════════════════
End of Guidelines
`;
  }
}

export default ProfileStorage;
