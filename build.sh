#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python Dependencies
echo "Installing Python dependencies..."
pip install -r backend/requirements.txt

# Build Frontend
echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..
