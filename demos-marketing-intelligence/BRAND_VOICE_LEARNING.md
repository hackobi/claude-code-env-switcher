# Brand Voice Learning System

The marketing intelligence platform now learns Demos Network's authentic brand voice by analyzing real content from multiple sources:
- **Twitter**: [@DemosNetwork](https://twitter.com/DemosNetwork) tweets
- **Paragraph Blog**: [https://paragraph.com/@demos](https://paragraph.com/@demos)

This provides a richer, more comprehensive understanding of Demos' voice across different content formats (short-form social vs. long-form blog).

## How It Works

### 1. Multi-Source Content Analysis
The system fetches content from multiple sources using **RapidAPI's Twitter API45** (cost-effective alternative to official Twitter API) and uses Claude Sonnet 4.5 to analyze:

**From Twitter** (100 tweets via RapidAPI):
- Short-form communication patterns
- Immediate, concise messaging style
- Community interaction patterns

**From Paragraph Blog** (10 recent posts):
- Long-form narrative style
- Technical explanations and deep dives
- Educational content structure
- Documentation and how-to patterns

**Combined Analysis:**
- **Voice characteristics**: tone, technical level, casualness, enthusiasm
- **Common phrases**: language patterns that Demos actually uses across formats
- **Avoided phrases**: marketing clichés that Demos avoids
- **Topic patterns**: how they announce features, explain tech, engage community
- **Structural patterns**: tweet length vs. blog paragraph structure, thread usage, emoji frequency
- **Cross-format consistency**: how voice adapts between short and long-form content

### 2. Profile Generation
Analysis results are saved as a **Brand Voice Profile** containing:
```typescript
{
  sources: {
    twitter: 100,      // Number of tweets analyzed
    paragraph: 10      // Number of blog posts analyzed
  },
  voiceCharacteristics: {
    tone: ["technical", "humble", "educational"],
    commonPhrases: ["Just shipped...", "Here's how..."],
    avoidedPhrases: ["revolutionary", "game-changing"],
    technicalLevel: 0.7,  // 70% technical
    casualness: 0.5,      // 50% casual
    enthusiasm: 0.6       // 60% enthusiastic
  },
  topicPatterns: {
    shippingAnnouncements: ["Just shipped X. Y lines of code..."],
    technicalExplanations: ["Here's how we built..."],
    communityEngagement: ["Great question about..."]
  },
  exampleTweets: {
    excellent: ["Real tweet examples"],
    good: ["More examples showing variety"]
  }
}
```

### 3. Automatic Updates
- Profiles are cached in `./data/brand-voice-profile.json`
- Auto-refresh every 168 hours (weekly) by default
- Manual refresh: `tsx src/scripts/learn-brand-voice.ts --force`

### 4. Content Review Integration
The BrandingAgent uses the learned profile to:
- Review generated content for brand alignment
- Detect off-brand language or tone mismatches
- Automatically improve content to match Demos' voice
- Score content against actual Demos patterns (not just guesses)

## Configuration

### Environment Variables
```bash
# RapidAPI key for Twitter API45 (required for brand learning)
# Get your key from: https://rapidapi.com/alexanderxbx/api/twitter-api45
RAPIDAPI_KEY=your_rapidapi_key

# Enable/disable brand learning
ENABLE_BRAND_LEARNING=true

# Include Paragraph blog in analysis (in addition to Twitter)
BRAND_LEARN_FROM_PARAGRAPH=true

# How often to refresh profile (hours)
BRAND_PROFILE_UPDATE_HOURS=168  # Weekly
```

### How Learning Works in Pipeline
1. **On First Run**:
   - Fetches 100 @DemosNetwork tweets
   - Fetches 10 Paragraph blog posts (if enabled)
   - Analyzes all content → saves profile
2. **On Subsequent Runs**: Loads cached profile if < 168 hours old
3. **On Profile Expiry**:
   - Fetches 50 new tweets + 5 new blog posts
   - Merges with existing profile (70% old, 30% new)

## Manual Brand Learning

### Run Brand Learning Script
```bash
# Learn from 100 tweets (default)
tsx src/scripts/learn-brand-voice.ts

# Learn from more tweets
tsx src/scripts/learn-brand-voice.ts --tweets=200

# Force refresh existing profile
tsx src/scripts/learn-brand-voice.ts --force
```

### Output Files
```
./data/
├── brand-voice-profile.json          # Machine-readable profile
└── brand-voice-guidelines.txt        # Human-readable guidelines
```

## Viewing the Learned Voice

After running the script, check `./data/brand-voice-guidelines.txt`:

```
DEMOS NETWORK BRAND VOICE GUIDELINES
Generated: 1/16/2026, 12:00:00 PM
Based on 100 analyzed tweets from @DemosNetwork

VOICE CHARACTERISTICS
Tone: technical, humble, educational, authentic
Technical Level: 70%
Casualness: 50%
Enthusiasm: 60%

COMMON PHRASES (Use These):
  • "Just shipped..."
  • "Here's how we built..."
  • "Cross-chain identity is hard..."

AVOIDED PHRASES (Don't Use):
  • "Revolutionary"
  • "Game-changing"
  • "To the moon"

[... more patterns and examples ...]
```

## Fallback Behavior

If brand learning fails (e.g., Twitter API issues, rate limits):
- System falls back to hardcoded `DEMOS_BRAND_IDENTITY` guidelines
- Error logged, but pipeline continues
- Next run will retry learning

## Benefits Over Hardcoded Guidelines

| Hardcoded Guidelines | Learned Voice |
|---------------------|---------------|
| Static, manually written | Dynamic, data-driven |
| Based on assumptions | Based on real Demos content |
| Never updated | Auto-updates weekly |
| Generic patterns | Actual examples and phrases |
| No adaptation to Demos' evolution | Evolves as Demos' voice evolves |

## How Learned Profile is Used

### In BrandingAgent
```typescript
const agent = new BrandingAgent(apiKey, learnedProfile);

// Reviews content against learned patterns
const review = await agent.reviewContent(tweetDraft);

// If off-brand, auto-improves using learned voice
if (!review.approved) {
  const improved = await agent.improveContent(
    tweetDraft,
    review.redFlags
  );
}
```

### In ContentPipeline
```typescript
// Automatically loads and applies learned profile
const pipeline = new ContentPipeline(/* ... */, {
  enableBrandLearning: true,
  brandProfileUpdateHours: 168
});

// On run, uses learned voice for all brand reviews
await pipeline.run();
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  ContentPipeline.run()                      │
│  ┌─────────────────────────────────────┐   │
│  │  initializeBrandVoice()             │   │
│  │  ├─ Check cache freshness           │   │
│  │  ├─ Load or learn from Twitter      │   │
│  │  └─ Update BrandingAgent            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  BrandingAgent                      │   │
│  │  ├─ Uses learned profile            │   │
│  │  ├─ Reviews content                 │   │
│  │  └─ Improves if off-brand           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

         ↓ Data Sources ↓

┌─────────────────────────────────────────────┐
│  @DemosNetwork Twitter                      │
│  ├─ Real tweets                             │
│  ├─ Actual voice patterns                   │
│  └─ Authentic examples                      │
└─────────────────────────────────────────────┘

         ↓ Analysis ↓

┌─────────────────────────────────────────────┐
│  BrandVoiceLearner                          │
│  ├─ Fetches tweets via RapidAPI (API45)    │
│  ├─ Fetches blog posts from Paragraph      │
│  ├─ Analyzes with Claude Sonnet 4.5        │
│  └─ Generates BrandVoiceProfile            │
└─────────────────────────────────────────────┘

         ↓ Storage ↓

┌─────────────────────────────────────────────┐
│  ProfileStorage (./data)                    │
│  ├─ brand-voice-profile.json               │
│  └─ brand-voice-guidelines.txt             │
└─────────────────────────────────────────────┘
```

## Example: Before vs After

### Before (Hardcoded)
```
Brand Identity: "Technical but approachable, avoid hype"
Generated Tweet: "Exciting news! We've revolutionized cross-chain..."
Review: ❌ Off-brand (uses "revolutionized", feels hype-y)
```

### After (Learned)
```
Learned Pattern: Demos says "Just shipped" not "Exciting news"
Learned Pattern: Demos says "Here's how we built" not "revolutionized"
Generated Tweet: "Just shipped Solana integration. 140 lines of code, tested on devnet. Here's how we built it..."
Review: ✅ On-brand (matches actual Demos patterns)
```

## Cost Considerations

### RapidAPI Twitter API45
- **Free tier**: Limited requests (check current limits on RapidAPI)
- **Paid tiers**: Starting ~$10/month for higher limits
- Much more affordable than official Twitter API ($100+/month)

### Claude API (Anthropic)
- **Learning**: ~$0.50 per analysis (100 tweets + 10 blog posts)
- **Weekly refresh**: ~$0.25 per refresh

### Storage
- **Local files**: Negligible (~50KB JSON file)
- **No runtime cost**: Uses cached profile

**Total**: ~$2-12/month depending on RapidAPI tier vs. $100+/month for official Twitter API

## Monitoring

Check brand learning status in pipeline logs:
```
🧠 Initializing brand voice learning...
  📥 Analyzing @DemosNetwork tweets...
  ✓ Fetched 100 tweets
  ✓ Generated brand voice profile
  ✓ Learned brand voice from 100 tweets
  📊 Technical: 70% | Casual: 50%
```

Or check cached profile:
```bash
cat ./data/brand-voice-profile.json | jq '.voiceCharacteristics'
```

## Troubleshooting

### "No tweets found to analyze"
- Check RapidAPI key is set in `.env`
- Verify @DemosNetwork account exists and has tweets
- Check RapidAPI usage limits at https://rapidapi.com/alexanderxbx/api/twitter-api45

### "Brand learning failed, using default guidelines"
- Check Anthropic API key
- Verify RapidAPI key is valid
- System falls back gracefully - no interruption

### "Profile age: 0 hours"
- Profile was just created
- Next update in `BRAND_PROFILE_UPDATE_HOURS` hours

## Future Enhancements

Potential improvements tracked in `AGENT_INTELLIGENCE_ROADMAP.md`:
- Multi-source learning (blog posts, docs, GitHub commits)
- A/B testing different voice profiles
- Sentiment-aware voice adaptation
- Voice consistency scoring across generated content
