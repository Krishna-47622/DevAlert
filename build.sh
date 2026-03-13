#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python Dependencies
echo "📦 Installing Python dependencies..."
# Skip pip upgrade to save time, Render's pip is usually recent enough
pip install -r backend/requirements.txt

# Build Frontend
echo "🏗️ Building Frontend..."
cd frontend

# Use 'npm install' instead of 'npm ci' to leverage Render's build cache
# Added flags to skip unnecessary checks for speed
echo "  - Installing npm packages..."
npm install --prefer-offline --no-audit --no-fund

echo "  - Running production build..."
npm run build
cd ..

echo "✅ Build complete!"
