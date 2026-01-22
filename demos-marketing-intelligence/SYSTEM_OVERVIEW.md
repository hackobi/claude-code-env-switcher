# Demos Marketing Intelligence - System Overview

Visual guide to understanding how everything works together.

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEMOS MARKETING ENGINE                           │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  EVERY 4 HRS │
    └──────┬───────┘
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │                  STEP 1: GATHER SOURCES                  │
    └─────────────────────────────────────────────────────────┘
           │
           ├─────> Twitter API ────> 100+ tweets/day
           │       • Influencers (Vitalik, Naval, etc.)
           │       • Keyword search (cross-chain, identity)
           │       • Trending topics
           │
           ├─────> Linear API ────> 20+ tasks/day
           │       • Completed tasks (last 7 days)
           │       • Shipped features
           │       • Upcoming milestones
           │
           └─────> GitHub API ────> Repository activity (optional)
                   • Commits
                   • Releases
                   • PR merges
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │               STEP 2: RELEVANCE SCORING                  │
    └─────────────────────────────────────────────────────────┘
           │
           │  For each item:
           │  ├─ Keyword matching (+0.4 per high-value match)
           │  ├─ Engagement scoring (+0.2 for viral tweets)
           │  ├─ Technical depth (+0.15 for protocols/tech)
           │  └─ Off-brand penalty (-0.3 for NFT mints, etc.)
           │
           │  Score: 0.0 ──────────> 1.0
           │         🔴  🟡      🟢
           │       Skip  Maybe  Generate
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │                STEP 3: FILTER & PRIORITIZE               │
    └─────────────────────────────────────────────────────────┘
           │
           │  Keep only: Score ≥ 0.6 (MIN_RELEVANCE_SCORE)
           │  Sort by:   Score descending
           │  Limit to:  Top 10 items (MAX_DRAFTS_PER_DAY)
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │              STEP 4: AI CONTENT GENERATION               │
    └─────────────────────────────────────────────────────────┘
           │
           │  For each high-scoring item:
           │
           │  Input Context:
           │  ├─ Trigger (tweet/task/trend)
           │  ├─ Recent Demos ships
           │  ├─ Upcoming features
           │  └─ Brand voice guidelines
           │
           │  ┌────────────────────────┐
           │  │  Claude Sonnet 4.5     │
           │  │  + Content Templates   │
           │  └────────────────────────┘
           │         │
           │         v
           │  Output:
           │  ├─ Single tweet (280 chars)
           │  ├─ Thread (3-7 tweets)
           │  └─ Or "SKIP" if not relevant
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │              STEP 5: SEND TO TYPEFULLY                   │
    └─────────────────────────────────────────────────────────┘
           │
           │  POST /drafts
           │  ├─ Content: Generated text
           │  ├─ Share: true (team can see)
           │  └─ Metadata: Source, score, reasoning
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │               STEP 6: HUMAN REVIEW                       │
    └─────────────────────────────────────────────────────────┘
           │
           │  Team reviews in Typefully:
           │  ├─ Edit content
           │  ├─ Approve & schedule
           │  └─ Or reject
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │                  STEP 7: PUBLISH                         │
    └─────────────────────────────────────────────────────────┘
           │
           │  Typefully handles:
           │  ├─ Scheduled posting
           │  ├─ Twitter publishing
           │  └─ Analytics tracking
           │
           v
    ┌─────────────────────────────────────────────────────────┐
    │               STEP 8: FEEDBACK LOOP                      │
    └─────────────────────────────────────────────────────────┘
           │
           │  Learn from:
           │  ├─ Published vs rejected drafts
           │  ├─ Engagement metrics
           │  └─ Team feedback
           │
           └────> (Improve future generations)
```

## 📊 Data Flow Example

### Example 1: Twitter Trend → Published Tweet

```
1. SOURCE
   Twitter search finds tweet:
   "Wallet fragmentation is killing Web3 UX. Every chain needs a different wallet."
   By: @cryptoinfluencer
   Engagement: 543 likes, 87 retweets

2. SCORING
   Keywords matched: "wallet fragmentation" (+0.4), "Web3 UX" (+0.2)
   Engagement: High (+0.15)
   Total: 0.75 🟢 HIGH

3. AI GENERATION
   Prompt: "Respond to this tweet with Demos perspective"
   
   Claude generates:
   "Exactly this. Users shouldn't need MetaMask for ETH, Phantom for SOL, 
   XDEFI for multi-chain, and different accounts everywhere.
   
   Demos CCI solves this: one identity, every chain. Your address becomes 
   your identity. 🔑
   
   Try it: demos.sh/faucet"

4. TYPEFULLY
   Draft created, shared with team

5. HUMAN REVIEW
   Team approves, schedules for 2pm

6. PUBLISH
   Tweet goes live, gets 127 likes, 34 retweets

7. FEEDBACK
   High engagement → Boost similar content in future
```

### Example 2: Linear Task → Ship Announcement

```
1. SOURCE
   Linear task completed:
   Title: "Implement Solana wallet integration"
   Labels: ["shipped", "feature"]
   Description: "Users can now link Phantom wallet to Demos CCI"

2. SCORING
   Keywords: "implement" (+0.25), "Solana" (+0.2)
   Shipped label: (+0.2)
   Total: 0.85 🟢 HIGH

3. AI GENERATION
   Template: ship_announcement
   
   Claude generates:
   "🚀 Just shipped: Solana wallet integration
   
   Developers can now link Phantom to Demos CCI and use it across any chain.
   
   One identity, infinite possibilities.
   
   Docs: demos.sh/solana"

4. TYPEFULLY
   Draft created

5. HUMAN REVIEW
   Team edits slightly, approves

6. PUBLISH
   Tweet goes live immediately

7. FEEDBACK
   Good engagement → Continue announcing Solana features
```

## 🎯 Content Mix Breakdown

```
WEEKLY OUTPUT (typical)
├─ 35 items processed
│  ├─ 20 from Twitter
│  └─ 15 from Linear
│
├─ 12 scored high enough (>0.6)
│
├─ 10 drafts generated
│  ├─ 6 trend commentary (60%)
│  ├─ 3 educational (30%)
│  └─ 1 promotional (10%)
│
├─ 7 approved by team
│
└─ 7 published to Twitter
   ├─ Avg engagement: 87 likes
   └─ Follower growth: +12/week
```

## 🔧 Configuration Impact

### Conservative Settings
```bash
MAX_DRAFTS_PER_DAY=5
MIN_RELEVANCE_SCORE=0.7
PIPELINE_INTERVAL_HOURS=6
```
**Result**: 5 high-quality drafts/day, less frequent

### Balanced Settings (Default)
```bash
MAX_DRAFTS_PER_DAY=10
MIN_RELEVANCE_SCORE=0.6
PIPELINE_INTERVAL_HOURS=4
```
**Result**: 10 good drafts/day, regular intervals

### Aggressive Settings
```bash
MAX_DRAFTS_PER_DAY=20
MIN_RELEVANCE_SCORE=0.4
PIPELINE_INTERVAL_HOURS=2
```
**Result**: 20 drafts/day, high volume (may reduce quality)

## 📈 Success Metrics Dashboard

```
┌────────────────────────────────────────────────────┐
│  DEMOS MARKETING INTELLIGENCE - WEEK 1 SUMMARY     │
├────────────────────────────────────────────────────┤
│                                                     │
│  📊 PIPELINE STATS                                  │
│  ├─ Total items processed:     245                │
│  ├─ High relevance (>0.7):     42  (17%)          │
│  ├─ Drafts generated:          35                 │
│  └─ Approved & published:      28  (80%)          │
│                                                     │
│  🐦 TWITTER PERFORMANCE                             │
│  ├─ Total engagement:          2,341              │
│  ├─ Avg likes per tweet:       87                 │
│  ├─ Avg retweets:              23                 │
│  └─ New followers:             +47                │
│                                                     │
│  ⚡ CONTENT BREAKDOWN                               │
│  ├─ Trend commentary:          17  (60.7%)        │
│  ├─ Educational threads:       8   (28.6%)        │
│  └─ Ship announcements:        3   (10.7%)        │
│                                                     │
│  🎯 TOP PERFORMING CONTENT                          │
│  1. "Wallet fragmentation thread" - 234 likes     │
│  2. "Solana integration ship" - 187 likes         │
│  3. "Cross-chain identity explained" - 156 likes  │
│                                                     │
└────────────────────────────────────────────────────┘
```

## 🚀 Quick Command Reference

```bash
# Setup
./scripts/setup.sh              # One-time setup
nano .env                        # Configure API keys

# Testing
npm run monitor all              # Check what's available
DRY_RUN=true npm run pipeline   # Test without posting
npm run generate "Test" tweet    # Manual generation

# Running
npm start                        # Start pipeline (4hr intervals)
npm run dev                      # Development mode (hot reload)
npm run dashboard                # View admin UI

# Monitoring
pm2 logs demos-marketing         # View logs (production)
docker logs -f demos-marketing   # View logs (docker)

# Maintenance
pm2 restart demos-marketing      # Restart service
docker-compose restart           # Restart containers
```

---

**This system runs 24/7, monitoring crypto Twitter and your development progress, generating relevant content that your team reviews and approves. Set it and mostly forget it. 🚀**
