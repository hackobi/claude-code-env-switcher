# Demos Marketing Intelligence - Quick Start

Get up and running in 5 minutes.

## 🚀 Super Quick Start

```bash
# 1. Clone and setup
git clone <repo-url>
cd demos-marketing-intelligence
./scripts/setup.sh

# 2. Configure API keys
nano .env
# Add your Typefully, Twitter, Linear, and Anthropic keys

# 3. Test it works
DRY_RUN=true npm run pipeline

# 4. Start the system
npm start

# 5. View dashboard
npm run dashboard
# Visit http://localhost:3001
```

## 📋 Required API Keys

Get these before starting:

| Service | Where to Get | What For |
|---------|-------------|----------|
| **Typefully** | [typefully.com/settings/api](https://typefully.com/settings/api) | Send drafts for review |
| **Twitter** | [developer.twitter.com](https://developer.twitter.com) | Monitor crypto Twitter |
| **Linear** | Linear Settings → API | Track completed tasks |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com) | AI content generation |

## ⚙️ Configuration

Edit `.env`:

```bash
# Required
TYPEFULLY_API_KEY=your_key
TWITTER_BEARER_TOKEN=your_token
LINEAR_API_KEY=your_key
LINEAR_TEAM_ID=your_team_id
ANTHROPIC_API_KEY=your_key

# Optional (good defaults provided)
MAX_DRAFTS_PER_DAY=10
MIN_RELEVANCE_SCORE=0.6
PIPELINE_INTERVAL_HOURS=4

# Brand learning (recommended)
ENABLE_BRAND_LEARNING=true
BRAND_LEARN_FROM_PARAGRAPH=true
BRAND_PROFILE_UPDATE_HOURS=168
```

## 🧠 Brand Voice Learning (NEW!)

The system now learns Demos' authentic voice from real content:

```bash
# 1. Test brand learning setup
npm run test:brand

# 2. Learn brand voice from Twitter + Paragraph blog
npm run learn:brand -- --all-sources

# 3. Review learned voice patterns
cat ./data/brand-voice-guidelines.txt
```

**What this does:**
- Analyzes 100 @DemosNetwork tweets + 10 Paragraph blog posts
- Extracts tone, common phrases, voice patterns with Claude
- Saves profile that auto-updates weekly
- Ensures all generated content matches Demos' authentic voice

**Read more:** [BRAND_VOICE_LEARNING.md](BRAND_VOICE_LEARNING.md)

## ✅ Verify Everything Works

```bash
# 1. Test brand learning
npm run test:brand

# 2. Test Twitter monitoring
npm run monitor twitter

# 3. Test Linear integration
npm run monitor linear

# 4. Generate test content
npm run generate "Just shipped cross-chain identity" linear_task

# 5. Run full pipeline (dry run)
DRY_RUN=true npm run pipeline
```

If all 5 commands succeed, you're ready!

## 🎯 First Real Run

```bash
# Remove dry run mode
npm run pipeline
```

Check Typefully for generated drafts!

## 🚨 Common Issues

**"Twitter 429 Error"**
→ Rate limited. Wait 15 minutes or increase delays in `src/integrations/twitter.ts`

**"No drafts generated"**
→ Lower `MIN_RELEVANCE_SCORE` in `.env` to `0.4`

**"Typefully unauthorized"**
→ Double-check your API key at [typefully.com/settings/api](https://typefully.com/settings/api)

## 📚 What's Next?

- **Customize content**: Edit `src/content/ai-generator.ts`
- **Adjust scoring**: Edit `src/content/relevance-scorer.ts`
- **Schedule runs**: System runs every 4 hours automatically
- **View analytics**: Dashboard at http://localhost:3001

## 🆘 Get Help

- **Full docs**: See [README.md](README.md)
- **Discord**: [Demos Community](https://discord.gg/demos)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

**You're all set! The system will now monitor crypto Twitter and Linear tasks, generate relevant content, and send drafts to Typefully for your review. 🎉**
