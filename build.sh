#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python Dependencies (pip cache speeds up repeat deploys)
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# Build Frontend
echo "Building Frontend..."
cd frontend
npm ci --prefer-offline
npm run build
cd ..

echo "✅ Build complete!"
