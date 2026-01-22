# Brand Voice Learning - Quick Reference Card

One-page reference for the brand voice learning system.

## 🚀 Quick Start (3 Commands)

```bash
# 1. Test setup
npm run test:brand

# 2. Learn brand voice
npm run learn:brand -- --all-sources

# 3. Start pipeline
npm run dev
```

## 📝 npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run test:brand` | Test setup and show profile status |
| `npm run learn:brand` | Learn from Twitter only |
| `npm run learn:brand -- --all-sources` | Learn from Twitter + Paragraph ⭐ |
| `npm run learn:brand -- --force` | Force refresh (ignore cache) |
| `npm run dev` | Start pipeline with brand learning |

## ⚙️ Configuration (.env)

```bash
ENABLE_BRAND_LEARNING=true              # Enable/disable system
BRAND_LEARN_FROM_PARAGRAPH=true         # Include blog posts
BRAND_PROFILE_UPDATE_HOURS=168          # Weekly refresh
```

## 📂 File Locations

| Path | Purpose |
|------|---------|
| `./data/brand-voice-profile.json` | Learned profile (machine-readable) |
| `./data/brand-voice-guidelines.txt` | Guidelines (human-readable) |
| `src/learning/brand-voice-learner.ts` | Core learning engine |
| `src/learning/profile-storage.ts` | Cache management |
| `src/integrations/paragraph.ts` | Blog post scraper |

## 🔍 What It Does

1. **Fetches Content:**
   - 100 tweets from [@DemosNetwork](https://twitter.com/DemosNetwork)
   - 10 blog posts from [Paragraph](https://paragraph.com/@demos)

2. **Analyzes with Claude:**
   - Voice characteristics (tone, technical level, casualness)
   - Common phrases Demos uses
   - Phrases Demos avoids
   - Topic patterns (shipping, technical, community)
   - Structural patterns (length, emojis, threads)

3. **Saves Profile:**
   - JSON format: `./data/brand-voice-profile.json`
   - Text format: `./data/brand-voice-guidelines.txt`
   - Auto-refreshes weekly

4. **Uses in Pipeline:**
   - BrandingAgent reviews all generated content
   - Flags off-brand content
   - Auto-improves to match learned voice

## 📊 Profile Structure

```typescript
{
  sources: { twitter: 100, paragraph: 10 },
  voiceCharacteristics: {
    tone: ["technical", "humble", "educational"],
    commonPhrases: ["Just shipped...", "Here's how..."],
    avoidedPhrases: ["revolutionary", "game-changing"],
    technicalLevel: 0.7,    // 70% technical
    casualness: 0.5,        // 50% casual
    enthusiasm: 0.6         // 60% enthusiastic
  },
  topicPatterns: { ... },
  structuralPatterns: { ... },
  exampleTweets: { ... }
}
```

## 🔄 Update Cycle

```
Initial Run → Fetch 100 tweets + 10 blog posts → Save profile
    ↓
Subsequent Runs → Load cached profile (if <168 hours)
    ↓
Weekly Refresh → Fetch 50 new tweets + 5 new posts → Merge (70%/30%)
    ↓
Manual Refresh → --force flag → Full refresh
```

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| "No tweets found" | Check `TWITTER_BEARER_TOKEN` in `.env` |
| "Brand learning failed" | System falls back to hardcoded guidelines |
| "Profile age: 0 hours" | Normal on first run - will refresh in 168h |
| Paragraph scraping fails | Set `BRAND_LEARN_FROM_PARAGRAPH=false` |

## 💰 Cost

| Operation | API Calls | Cost | Frequency |
|-----------|-----------|------|-----------|
| Initial learning | 1 Claude call | ~$0.50 | One-time |
| Weekly refresh | 1 Claude call | ~$0.25 | Weekly |
| Storage | None | $0 | N/A |

**Monthly total:** ~$2/month

## 🎯 Example Output

```
🔍 Learning brand voice from multiple sources...
  📱 Fetching 100 tweets from @DemosNetwork...
    ✓ Fetched 100 tweets
  📝 Fetching 10 blog posts from Paragraph...
    ✓ Fetched 10 blog posts
  ✓ Generated brand voice profile from 110 samples

📊 BRAND VOICE PROFILE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last Updated:      2025-01-16T10:30:00Z
Total Samples:     110
Sources:           100 tweets + 10 blog paragraphs

VOICE CHARACTERISTICS
Tone:              technical, humble, educational, authentic
Technical Level:   70%
Casualness:        50%
Enthusiasm:        60%

Common Phrases:    15 identified
Avoided Phrases:   8 identified

✓ Saved profile to ./data/brand-voice-profile.json
✓ Exported guidelines to ./data/brand-voice-guidelines.txt
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute setup guide |
| [BRAND_VOICE_LEARNING.md](BRAND_VOICE_LEARNING.md) | Full architecture docs |
| [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) | Implementation summary |
| This file | Quick reference card |

## 🔗 Data Sources

- Twitter: [@DemosNetwork](https://twitter.com/DemosNetwork)
- Blog: [https://paragraph.com/@demos](https://paragraph.com/@demos)

---

**Need help?** Run `npm run test:brand` to verify your setup.
