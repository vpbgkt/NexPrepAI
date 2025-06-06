#!/bin/bash

# NexPrep Deployment Script
# This script safely deploys the application to production

set -e  # Exit on any error

echo "🚀 Starting NexPrep deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on the server
if [ ! -f "/home/ubuntu/.ssh/authorized_keys" ]; then
    print_error "This script should be run on the production server"
    exit 1
fi

# Navigate to project directory
cd ~/NexPrep || { print_error "NexPrep directory not found"; exit 1; }

print_status "Stashing local changes..."
git stash -q || true

print_status "Pulling latest changes from repository..."
git pull --ff-only

print_status "Installing backend dependencies..."
cd backend && npm ci --omit=dev

print_status "Installing admin-panel dependencies..."
cd ../admin-panel && npm ci --legacy-peer-deps

print_status "Building admin-panel for production..."
npm run build:prod

print_status "Installing frontend dependencies..."
cd ../frontend && npm ci --legacy-peer-deps

print_status "Building frontend for production..."
npm run build:prod

print_status "Updating web server files..."
sudo rsync -av --delete ../admin-panel/dist/admin-panel/ /var/www/admin-panel/
sudo rsync -av --delete dist/frontend/ /var/www/frontend/

print_status "Restarting backend service..."
cd ..
# Check if PM2 process exists, if not start it, otherwise reload it
if pm2 list | grep -q "nexprep-backend"; then
    pm2 reload nexprep-backend
else
    pm2 start ecosystem.config.js --env production
fi

print_status "Reloading nginx..."
sudo systemctl reload nginx

print_status "Cleaning up git stash..."
cd ..
git stash drop -q || true

print_status "✅ Deployment completed successfully!"

# Display service status
print_status "Service status:"
pm2 status nexprep-backend

print_status "Recent logs:"
pm2 logs nexprep-backend --lines 10 --nostream
