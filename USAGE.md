# Demos Marketing Intelligence - Usage Guide

Complete guide to using the marketing automation system.

## 📊 Daily Workflow

### Morning Routine

```bash
# 1. Check what was generated overnight
npm run monitor all

# 2. Review drafts in Typefully
# Visit typefully.com/drafts

# 3. Approve and schedule best drafts
# Use Typefully UI to edit/schedule
```

### Manual Content Generation

```bash
# Generate from Linear task
npm run generate "Implement Solana wallet support" linear_task

# React to crypto trend
npm run generate "Wallet fragmentation discussion" trend

# Create educational thread
npm run generate "How cross-chain identity works" thread
```

### On-Demand Pipeline Run

```bash
# When you want fresh content NOW
npm run pipeline

# Test without sending to Typefully
DRY_RUN=true npm run pipeline
```

---

## 🎯 Content Strategy

### What Gets Generated

**High Priority (Score >0.7):**
- Cross-chain identity discussions
- Wallet fragmentation topics
- Blockchain interoperability news
- Major shipped features from Linear

**Medium Priority (Score 0.4-0.7):**
- Web3 UX improvements
- Developer experience topics
- Bridge announcements
- Minor feature launches

**Filtered Out (Score <0.4):**
- NFT mints, airdrops
- Generic crypto news
- Off-brand topics
- Minor bug fixes

### Content Types Generated

| Type | When | Example |
|------|------|---------|
| **Ship Announcement** | Linear task completed with "shipped" label | "🚀 Just shipped: Solana wallet integration" |
| **Trend Commentary** | High-engagement tweet about relevant topic | "Wallet fragmentation is killing Web3 UX..." |
| **Educational Thread** | Complex topic where Demos has expertise | "🧵 How cross-chain identity works (1/7)" |
| **Influencer Response** | Crypto thought leader tweets relevant content | Reply to Vitalik about identity systems |
| **Weekly Digest** | Every Friday | "This week at Demos Network..." |

---

## ⚙️ Configuration Tuning

### Adjust Content Volume

```bash
# .env
MAX_DRAFTS_PER_DAY=10    # Increase for more content
PIPELINE_INTERVAL_HOURS=4 # Decrease for more frequent runs
```

### Adjust Quality Threshold

```bash
# .env
MIN_RELEVANCE_SCORE=0.6  # Lower = more content (but less relevant)
                         # Higher = less content (but higher quality)
```

**Recommended Values:**
- Conservative (high quality): `0.7`
- Balanced: `0.6` (default)
- Aggressive (volume): `0.4`

### Enable/Disable Sources

```bash
# .env
MONITOR_CRYPTO_INFLUENCERS=true   # Twitter influencers
MONITOR_REDDIT=false              # Reddit threads
MONITOR_NEWS_FEEDS=false          # CoinDesk, The Block
```

---

## 🐦 Twitter Monitoring

### Monitored Influencers

The system tracks these crypto thought leaders by default:
- Vitalik Buterin (@vitalikbuterin)
- Naval (@naval)
- Balaji Srinivasan (@balajis)
- Hasu (@hasufl)
- Anthony Sassano (@sassal0x)
- Punk6529 (@punk6529)
- Venture Coinist (@VentureCoinist)
- Two Bit Idiot (@twobitidiot)

**To add more**, edit [src/integrations/twitter.ts](src/integrations/twitter.ts):

```typescript
export const CRYPTO_INFLUENCERS = [
  'vitalikbuterin',
  'your_new_influencer',  // Add here
];
```

### Monitored Keywords

Tweets containing these keywords are analyzed:
- cross-chain, cross chain
- wallet fragmentation
- blockchain identity
- decentralized identity
- multi-chain, multichain
- blockchain interoperability
- web3 ux, crypto ux
- developer experience
- chain abstraction

**To add keywords**, edit the same file:

```typescript
export const DEMOS_KEYWORDS = [
  'cross-chain',
  'your-new-keyword',  // Add here
];
```

---

## 📋 Linear Integration

### Auto-Generated Content

Tasks are analyzed and content is generated when:
1. Task is completed (status = Done)
2. Task has "shipped" label
3. Task is significant (not minor fixes/docs)

### Task Filters

**Shippable tasks** must meet one of:
- Contains keywords: feature, add, implement, integrate, support, launch
- Has "shipped" label
- Is a major milestone

**Filtered out:**
- Minor fixes ("fix typo", "update readme")
- Cleanup tasks
- Internal refactors

### Configure Linear Team

```bash
# .env
LINEAR_TEAM_ID=your_team_id  # Get from Linear Settings → API
```

To find your team ID:
1. Go to Linear Settings → API
2. Create API key
3. Use Linear API Explorer to find team ID

---

## 🤖 AI Content Customization

### Adjust Brand Voice

Edit [src/content/ai-generator.ts](src/content/ai-generator.ts):

```typescript
const DEMOS_BRAND_VOICE = `
You are the social media voice for Demos Network.

[Customize this section with your preferred tone, style, values]
`;
```

### Modify Content Templates

```typescript
const CONTENT_TEMPLATES = {
  ship_announcement: `
    Feature: {{feature_name}}

    Create a tweet that:
    - [Your custom instructions]
  `,

  trend_commentary: `
    [Your custom template]
  `,
};
```

### Change AI Model

```typescript
export class AIContentGenerator {
  private model = 'claude-sonnet-4-5-20250929';  // Change to opus for higher quality
}
```

**Available models:**
- `claude-sonnet-4-5-20250929`: Fast, cost-effective (recommended)
- `claude-opus-4-5-20251101`: Highest quality, slower, expensive

---

## 📊 Dashboard Usage

### Access Dashboard

```bash
cd dashboard
npm run dev
# Visit http://localhost:3001
```

### Features

**Pipeline Control:**
- View generated drafts
- Trigger manual pipeline runs
- See relevance scores

**Draft Management:**
- Send to Typefully
- Edit content
- Regenerate variations
- Delete drafts

**Analytics:**
- Total drafts generated
- Published count
- Average relevance score
- Weekly growth

---

## 🔍 Monitoring & Debugging

### View Real-Time Logs

```bash
# Development mode (detailed logs)
npm run dev

# Production mode
npm start
```

### Monitor Specific Sources

```bash
# Twitter only
npm run monitor twitter

# Linear only
npm run monitor linear

# Everything
npm run monitor all
```

### Debug Content Generation

```bash
# Generate with verbose output
DEBUG=true npm run generate "Your prompt here" tweet

# Check relevance scoring
npm run monitor all | grep "Relevance"
```

### Common Debug Commands

```bash
# Check if Twitter API is working
curl -H "Authorization: Bearer $TWITTER_BEARER_TOKEN" \
  "https://api.twitter.com/2/tweets/search/recent?query=cross-chain"

# Check if Linear API is working
curl -H "Authorization: $LINEAR_API_KEY" \
  "https://api.linear.app/graphql" \
  -d '{"query":"{ viewer { id name } }"}'

# Test Typefully API
curl -H "Authorization: Bearer $TYPEFULLY_API_KEY" \
  "https://api.typefully.com/v1/account"
```

---

## 🚀 Production Tips

### Run as Background Service (PM2)

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start dist/index.js --name demos-marketing

# View logs
pm2 logs demos-marketing

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Run with Docker

```bash
# Build
docker build -t demos-marketing .

# Run
docker run -d \
  --name demos-marketing \
  --env-file .env \
  -p 3000:3000 \
  demos-marketing

# View logs
docker logs -f demos-marketing
```

### Environment-Specific Configs

```bash
# Production
NODE_ENV=production npm start

# Development
NODE_ENV=development npm run dev

# Staging
NODE_ENV=staging npm run pipeline
```

---

## 📈 Performance Tuning

### Optimize API Calls

```bash
# Reduce Twitter API calls
# src/integrations/twitter.ts
await this.sleep(2000);  // Increase delay

# Reduce draft generation
# .env
MAX_DRAFTS_PER_DAY=5
```

### Batch Operations

The system automatically batches:
- Twitter API calls (1-second delays)
- Typefully uploads (500ms delays)
- Claude API calls (managed by SDK)

### Memory Usage

Monitor with:
```bash
# PM2
pm2 monit

# Docker
docker stats demos-marketing
```

---

## 🔧 Advanced Customization

### Add Custom Data Sources

Create new integration in `src/integrations/`:

```typescript
// src/integrations/reddit.ts
export class RedditMonitor {
  async getTopPosts(subreddit: string) {
    // Implementation
  }
}
```

Then use in pipeline:

```typescript
// src/workflows/content-pipeline.ts
const reddit = new RedditMonitor();
const posts = await reddit.getTopPosts('cryptocurrency');
```

### Custom Scoring Logic

```typescript
// src/content/relevance-scorer.ts
scoreTweet(tweet: Tweet): ScoredContent {
  let score = 0;

  // Your custom scoring logic
  if (tweet.text.includes('demos')) {
    score += 0.5;
  }

  return { content: tweet, score, category: 'high' };
}
```

### Webhook Integration

Add webhook endpoint for external triggers:

```typescript
// src/webhooks/linear.ts
app.post('/webhooks/linear', async (req, res) => {
  const event = req.body;

  if (event.type === 'Issue' && event.action === 'update') {
    // Trigger pipeline
    await runPipeline();
  }

  res.sendStatus(200);
});
```

---

## 📚 Best Practices

### Content Quality

✅ **Do:**
- Let the AI skip if not genuinely relevant
- Review and edit drafts before publishing
- Track what performs well in analytics
- Adjust relevance scoring based on results

❌ **Don't:**
- Force promotional content
- Publish without review
- Spam with low-quality drafts
- Ignore engagement metrics

### API Usage

✅ **Do:**
- Respect rate limits
- Use DRY_RUN mode for testing
- Monitor API quota usage
- Implement error handling

❌ **Don't:**
- Run pipeline too frequently (<1 hour)
- Ignore API errors
- Skip retry logic
- Exceed daily quotas

### Security

✅ **Do:**
- Use environment variables
- Rotate API keys regularly
- Monitor for suspicious activity
- Keep dependencies updated

❌ **Don't:**
- Commit .env files
- Share API keys
- Run as root user
- Expose internal endpoints

---

## 🆘 Troubleshooting

See [README.md#troubleshooting](README.md#troubleshooting) for common issues.

**Still stuck?**
- Discord: [Demos Community](https://discord.gg/demos)
- GitHub Issues: [Report a bug](https://github.com/your-repo/issues)
- Email: support@demos.sh

---

**Happy automating! 🚀**
