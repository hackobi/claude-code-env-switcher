#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "🚀 Demos Marketing Intelligence - Setup Script"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    echo "   Install from: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install main dependencies
echo "📦 Installing main dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Main dependency installation failed"
    exit 1
fi
echo "✅ Main dependencies installed"
echo ""

# Install dashboard dependencies
echo "📦 Installing dashboard dependencies..."
cd dashboard
npm install
if [ $? -ne 0 ]; then
    echo "❌ Dashboard dependency installation failed"
    exit 1
fi
cd ..
echo "✅ Dashboard dependencies installed"
echo ""

# Setup environment
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your API keys:"
    echo "   - TYPEFULLY_API_KEY"
    echo "   - TWITTER_BEARER_TOKEN"
    echo "   - LINEAR_API_KEY"
    echo "   - ANTHROPIC_API_KEY"
    echo ""
    echo "   Run: nano .env"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "⚠️  Build failed (this is OK if .env is not configured yet)"
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure API keys: nano .env"
echo "  2. Test pipeline:      DRY_RUN=true npm run pipeline"
echo "  3. Start system:       npm start"
echo "  4. View dashboard:     npm run dashboard"
echo ""
echo "For help, see README.md or run: npm run monitor"
echo ""
