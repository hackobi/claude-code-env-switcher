# Demos Marketing Intelligence System

AI-powered marketing automation for Demos Network. Monitors crypto Twitter, tracks Linear tasks, generates contextual content, and integrates with Typefully for seamless publishing.

## 🎯 Overview

This system transforms Demos' development activity and crypto industry trends into engaging social media content automatically.

**What it does:**
- 🐦 Monitors crypto Twitter for relevant trends and influencer discussions
- 📋 Tracks Linear tasks and shipped features
- 🤖 Generates authentic, contextual content using Claude AI
- 📊 Scores content relevance using intelligent filtering
- ✍️  Sends draft tweets/threads to Typefully for review
- 📈 Provides analytics dashboard for performance tracking

**Content Mix:**
- 60% value-add commentary on crypto trends
- 30% educational content
- 10% promotional (ships, features)

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd demos-marketing-intelligence
npm install

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

**Required API Keys:**
- **Typefully**: Get from [typefully.com/settings/api](https://typefully.com/settings/api)
- **Twitter**: Apply at [developer.twitter.com](https://developer.twitter.com)
- **Anthropic**: Get from [console.anthropic.com](https://console.anthropic.com)
- **Linear**: Get from Linear Settings → API
- **GitHub**: Create at [github.com/settings/tokens](https://github.com/settings/tokens)

### 3. Run the System

```bash
# Run pipeline once (dry run mode)
DRY_RUN=true npm run pipeline

# Start continuous monitoring
npm run dev

# Start dashboard
npm run dashboard
# Visit http://localhost:3001
```

---

## 📚 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            DEMOS MARKETING INTELLIGENCE ENGINE              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Sources                 Intelligence              Output   │
│  ┌─────────┐            ┌─────────────┐        ┌─────────┐ │
│  │ Twitter │───────────▶│ Relevance   │───────▶│Typefully│ │
│  │ Linear  │            │   Scoring   │        └─────────┘ │
│  │ GitHub  │            └─────────────┘                     │
│  └─────────┘                   │                            │
│       │                        ▼                            │
│       │               ┌─────────────────┐                   │
│       └──────────────▶│  AI Generator   │                   │
│                       │  (Claude 4.5)   │                   │
│                       └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Twitter Monitor** | Track crypto influencers & trends | Twitter API v2 |
| **Linear Integration** | Pull completed tasks & milestones | Linear SDK |
| **Relevance Scorer** | Filter high-quality opportunities | Custom scoring |
| **AI Generator** | Create authentic content | Claude Sonnet 4.5 |
| **Typefully Client** | Send drafts for review | Typefully API |
| **Dashboard** | Monitor & manage pipeline | Next.js + React |

---

## 💻 Usage

### Run Pipeline Manually

```bash
# Generate content from current sources
npm run pipeline

# Dry run (don't send to Typefully)
DRY_RUN=true npm run pipeline
```

### Monitor Sources

```bash
# Monitor crypto Twitter
npm run monitor twitter

# Monitor Linear tasks
npm run monitor linear

# Monitor everything
npm run monitor all
```

### Generate Content from Prompt

```bash
# Generate single tweet
npm run generate "Just shipped Solana integration" linear_task

# Generate thread
npm run generate "Cross-chain identity explained" thread

# Respond to trend
npm run generate "Wallet fragmentation is a UX problem" trend
```

### Start Continuous Pipeline

```bash
# Runs every 4 hours (configurable)
npm start

# Development mode with hot reload
npm run dev
```

### Access Dashboard

```bash
cd dashboard
npm run dev
# Visit http://localhost:3001
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Content Generation
MAX_DRAFTS_PER_DAY=10          # Max drafts per pipeline run
MIN_RELEVANCE_SCORE=0.6        # Minimum quality threshold (0-1)
PIPELINE_INTERVAL_HOURS=4      # How often to run pipeline

# Feature Flags
MONITOR_CRYPTO_INFLUENCERS=true
MONITOR_REDDIT=false
MONITOR_NEWS_FEEDS=false
DRY_RUN=false                  # Test mode (don't send to Typefully)
```

### Customizing Content Strategy

Edit [src/content/ai-generator.ts](src/content/ai-generator.ts):

```typescript
// Adjust brand voice
const DEMOS_BRAND_VOICE = `...`;

// Modify content templates
const CONTENT_TEMPLATES = {
  ship_announcement: `...`,
  trend_commentary: `...`,
  // ...
};
```

### Adjusting Relevance Scoring

Edit [src/content/relevance-scorer.ts](src/content/relevance-scorer.ts):

```typescript
// Add high-value keywords for your domain
private readonly HIGH_VALUE_KEYWORDS = [
  'cross-chain',
  'identity',
  // Add more...
];

// Filter out off-brand content
private readonly NEGATIVE_KEYWORDS = [
  'nft mint',
  'airdrop',
  // Add more...
];
```

---

## 📊 Dashboard Features

The Next.js dashboard provides:

- **📈 Analytics**: Total drafts, published count, relevance scores
- **✍️ Draft Management**: Review, edit, approve AI-generated content
- **🎯 Relevance Insights**: See why content was flagged
- **🔄 Pipeline Control**: Trigger manual runs, adjust settings
- **📅 Content Calendar**: View upcoming scheduled posts

**Access**: http://localhost:3001 (after `npm run dashboard`)

---

## 🧠 How It Works

### 1. Content Discovery
The system monitors multiple sources:
- Crypto Twitter influencers (Vitalik, Naval, etc.)
- Keyword searches (#crosschain, #identity, etc.)
- Linear completed tasks (last 7 days)
- GitHub activity (optional)

### 2. Relevance Scoring
Each piece of content is scored (0-1) based on:
- Keyword matching (high-value, medium-value)
- Engagement metrics (for tweets)
- Feature significance (for Linear tasks)
- Technical depth indicators

**Thresholds:**
- 🟢 High (0.7+): Auto-generate content
- 🟡 Medium (0.4-0.7): Consider with caution
- 🔴 Low (<0.4): Skip

### 3. AI Content Generation
Claude Sonnet 4.5 generates content using:
- **Context**: Recent Demos ships, value props, technical details
- **Templates**: Ship announcements, trend commentary, educational threads
- **Brand voice**: Technical but approachable, authentic, educational

**Output formats:**
- Single tweets (280 chars)
- Threads (3-7 tweets)
- Replies to influencers

### 4. Review & Publish
- Drafts sent to Typefully for human review
- Team can edit, approve, or reject
- Published posts tracked for analytics

---

## 🔧 Advanced Features

### Scheduled Pipeline Runs

The system runs automatically every 4 hours (configurable):

```typescript
// src/index.ts
const cronExpression = `0 */${PIPELINE_INTERVAL_HOURS} * * *`;
cron.schedule(cronExpression, async () => {
  await runPipeline();
});
```

### Custom Triggers

Add custom event triggers in [src/workflows/content-pipeline.ts](src/workflows/content-pipeline.ts):

```typescript
// Example: React to GitHub releases
const releases = await github.getLatestReleases();
for (const release of releases) {
  const context = {
    trigger: { type: 'milestone', content: release.name },
    demosContext: { /* ... */ },
  };
  await aiGenerator.generate(context);
}
```

### Webhook Integration

Receive webhooks from Linear/GitHub:

```bash
# Add webhook endpoint
# POST /webhooks/linear
# POST /webhooks/github

# Configure in Linear: Settings → Webhooks
# Configure in GitHub: Repo → Settings → Webhooks
```

---

## 📁 Project Structure

```
demos-marketing-intelligence/
├── src/
│   ├── integrations/
│   │   ├── typefully.ts      # Typefully API client
│   │   ├── twitter.ts         # Twitter monitoring
│   │   ├── linear.ts          # Linear task tracking
│   │   └── github.ts          # GitHub activity (optional)
│   ├── content/
│   │   ├── ai-generator.ts    # Claude-powered content generation
│   │   └── relevance-scorer.ts # Intelligent filtering
│   ├── workflows/
│   │   └── content-pipeline.ts # Main orchestrator
│   ├── cli/
│   │   ├── monitor.ts         # CLI monitoring tool
│   │   └── generate.ts        # Manual content generation
│   └── index.ts               # Main entry point
├── dashboard/
│   ├── app/
│   │   ├── page.tsx           # Main dashboard
│   │   └── layout.tsx         # Layout wrapper
│   └── package.json
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎨 Demos Brand Guidelines

The AI generator follows Demos brand guidelines:

**Colors:**
- Primary: `#2B36D9` (Palatinate Blue)
- Secondary: `#FF4808` (Solar Flame)
- Accent: `#FF35F9` (Magenta), `#00DAFF` (Cyan)

**Voice:**
- Technical but approachable
- Authentic over promotional
- Educational and substantive
- Confident without arrogance

**Content Strategy:**
- Focus on cross-chain, identity, DX
- Show the hard work, not just hype
- Participate in conversations authentically
- Never force product mentions

---

## 🔒 Security & Best Practices

### API Key Safety
```bash
# Never commit .env files
echo ".env" >> .gitignore

# Use environment variables in production
export ANTHROPIC_API_KEY=sk-...
```

### Rate Limiting
The system respects API limits:
- Twitter: 1-second delays between requests
- Typefully: 500ms delays between draft uploads
- Claude: Managed by Anthropic SDK

### Error Handling
All integrations include retry logic and graceful degradation:
```typescript
try {
  await twitter.monitorInfluencers();
} catch (error) {
  console.error('Twitter failed, continuing with Linear...');
}
```

---

## 📊 Analytics & Monitoring

### Logging
```bash
# View real-time logs
npm run dev

# Production logging (PM2)
pm2 logs demos-marketing
```

### Metrics Tracked
- Drafts generated per day
- Average relevance score
- Sources monitored (Twitter, Linear)
- Typefully drafts created
- Error rates

---

## 🚢 Deployment

### Option 1: VPS (Recommended)

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repo-url>
cd demos-marketing-intelligence
npm install
npm run build

# Setup environment
cp .env.example .env
nano .env

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name demos-marketing
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t demos-marketing .
docker run -d --env-file .env -p 3000:3000 demos-marketing
```

### Option 3: Serverless (Vercel/Railway)

```bash
# Deploy to Vercel
vercel deploy

# Or Railway
railway up
```

---

## 🐛 Troubleshooting

### "Twitter API Error: 429 Too Many Requests"
**Solution**: Increase delay between requests in [src/integrations/twitter.ts](src/integrations/twitter.ts)

```typescript
await this.sleep(2000); // Increase from 1000ms to 2000ms
```

### "Typefully API Error: Unauthorized"
**Solution**: Check API key in `.env`

```bash
# Get new key from typefully.com/settings/api
TYPEFULLY_API_KEY=your_new_key_here
```

### "Claude API Error: Rate limit exceeded"
**Solution**: Reduce `MAX_DRAFTS_PER_DAY` in `.env`

```bash
MAX_DRAFTS_PER_DAY=5  # Reduce from 10
```

### "No drafts generated"
**Solution**: Lower `MIN_RELEVANCE_SCORE`

```bash
MIN_RELEVANCE_SCORE=0.4  # From 0.6
```

---

## 🛣️ Roadmap

- [x] Core pipeline (Twitter + Linear + AI)
- [x] Typefully integration
- [x] Admin dashboard
- [ ] Reddit monitoring (r/cryptocurrency, r/ethdev)
- [ ] News feed integration (CoinDesk, The Block)
- [ ] A/B testing for headlines
- [ ] Sentiment analysis for community feedback
- [ ] Auto-response to mentions
- [ ] Farcaster integration
- [ ] Video snippet generation
- [ ] On-chain proof via DAHR

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Demos Community](https://discord.gg/demos)
- **Docs**: [demos.sh/docs](https://demos.sh/docs)

---

**Built with ❤️ for the Demos Network community**
