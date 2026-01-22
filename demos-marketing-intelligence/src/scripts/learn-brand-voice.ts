#!/usr/bin/env tsx
/**
 * Standalone script to learn brand voice from @DemosNetwork tweets
 * Usage: tsx src/scripts/learn-brand-voice.ts
 */

import 'dotenv/config';
import { BrandVoiceLearner } from '../learning/brand-voice-learner';
import ProfileStorage from '../learning/profile-storage';

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('🧠 DEMOS BRAND VOICE LEARNING');
  console.log('═══════════════════════════════════════════\n');

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  if (!process.env.RAPIDAPI_KEY) {
    console.error('❌ Missing RAPIDAPI_KEY environment variable');
    console.error('   Get your key from: https://rapidapi.com/alexanderxbx/api/twitter-api45');
    process.exit(1);
  }

  try {
    // Initialize learner and storage (using RapidAPI for Twitter)
    const learner = new BrandVoiceLearner(
      process.env.ANTHROPIC_API_KEY,
      process.env.RAPIDAPI_KEY
    );
    const storage = new ProfileStorage();

    // Check for existing profile
    const existingProfile = await storage.load();

    if (existingProfile) {
      console.log('📋 Found existing profile:');
      console.log(`   Last updated: ${new Date(existingProfile.lastUpdated).toLocaleString()}`);
      console.log(`   Samples analyzed: ${existingProfile.samplesAnalyzed}`);
      console.log(`   Technical level: ${Math.round(existingProfile.voiceCharacteristics.technicalLevel * 100)}%`);

      const ageHours = await storage.getProfileAge();
      console.log(`   Age: ${Math.round(ageHours!)} hours\n`);

      // Ask if should update
      const shouldUpdate = process.argv.includes('--force') || ageHours! > 168;

      if (shouldUpdate) {
        console.log('🔄 Updating existing profile...\n');
        const updatedProfile = await learner.updateProfile(existingProfile);
        await storage.save(updatedProfile);
        await storage.exportAsText(updatedProfile);

        console.log('\n✅ Profile updated successfully!');
        printProfileSummary(updatedProfile);
      } else {
        console.log('ℹ️  Profile is recent. Use --force to update anyway.\n');
        printProfileSummary(existingProfile);
      }
    } else {
      // Learn from scratch
      console.log('🆕 No existing profile found. Learning from scratch...\n');

      const tweetCount = parseInt(process.argv.find(arg => arg.startsWith('--tweets='))?.split('=')[1] || '100');
      const blogCount = parseInt(process.argv.find(arg => arg.startsWith('--blog='))?.split('=')[1] || '10');
      const allSources = process.argv.includes('--all-sources');

      let profile;
      if (allSources) {
        console.log(`📚 Learning from all sources (${tweetCount} tweets + ${blogCount} blog posts)...\n`);
        profile = await learner.learnFromAllSources(tweetCount, blogCount);
      } else {
        profile = await learner.learnFromTwitter(tweetCount);
      }

      // Save profile
      await storage.save(profile);
      const textPath = await storage.exportAsText(profile);

      console.log('\n✅ Brand voice profile created successfully!');
      console.log(`📄 Guidelines exported to: ${textPath}\n`);

      printProfileSummary(profile);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function printProfileSummary(profile: any) {
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 PROFILE SUMMARY');
  console.log('═══════════════════════════════════════════');

  const sources = profile.sources
    ? `${profile.sources.twitter} tweets + ${profile.sources.paragraph} blog paragraphs`
    : `${profile.samplesAnalyzed} samples`;

  console.log(`Samples: ${sources}`);
  console.log(`Tone: ${profile.voiceCharacteristics.tone.join(', ')}`);
  console.log(`Technical: ${Math.round(profile.voiceCharacteristics.technicalLevel * 100)}%`);
  console.log(`Casualness: ${Math.round(profile.voiceCharacteristics.casualness * 100)}%`);
  console.log(`Enthusiasm: ${Math.round(profile.voiceCharacteristics.enthusiasm * 100)}%`);

  console.log('\nCommon Phrases:');
  profile.voiceCharacteristics.commonPhrases.slice(0, 5).forEach((phrase: string) => {
    console.log(`  • "${phrase}"`);
  });

  console.log('\nAvoided Phrases:');
  profile.voiceCharacteristics.avoidedPhrases.slice(0, 5).forEach((phrase: string) => {
    console.log(`  • "${phrase}"`);
  });

  console.log('\nStructural Patterns:');
  console.log(`  • Avg tweet length: ${profile.structuralPatterns.averageTweetLength} chars`);
  console.log(`  • Thread usage: ${Math.round(profile.structuralPatterns.threadUsage * 100)}%`);
  console.log(`  • Emoji usage: ${profile.structuralPatterns.emojiUsage.toFixed(1)} per tweet`);

  console.log('\nTop Example Tweet:');
  console.log(`  "${profile.exampleTweets.excellent[0]}"`);
  console.log('═══════════════════════════════════════════\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
