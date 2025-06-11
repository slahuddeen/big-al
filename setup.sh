#!/bin/bash

echo "🦖 Setting up Big Al Hex Game..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (version 16+) first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🚀 Setup complete! You can now start the game with:"
    echo ""
    if command -v yarn &> /dev/null; then
        echo "   yarn dev"
    else
        echo "   npm run dev"
    fi
    echo ""
    echo "The game will open at http://localhost:3000"
    echo ""
    echo "🎮 Have fun surviving in the Jurassic world!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi