#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python Dependencies from the backend folder
echo "Installing Python dependencies..."
pip install -r backend/requirements.txt

# Build Frontend from the frontend folder
echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build complete!"
