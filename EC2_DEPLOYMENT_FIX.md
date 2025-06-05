# EC2 Server Angular 19 Dependency Fix

## Issue
The EC2 server is experiencing the same dependency conflict we resolved locally:
- `ng2-charts@4.1.1` requires `@angular/cdk@>=14.0.0`
- But it's pulling in `@angular/cdk@20.0.2` which requires Angular 20/21
- This conflicts with our Angular 19.2.14 installation

## Solution
Use the same fix we applied locally by installing with legacy peer deps.

## Commands to Run on EC2 Server

```bash
# Navigate to admin-panel directory
cd ~/NexPrep/admin-panel

# Clean existing node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install with legacy peer deps to resolve conflicts
npm install --legacy-peer-deps

# Verify installation
npm list @angular/core ng2-charts

# Test build
npm run build

# For frontend directory (if needed)
cd ~/NexPrep/frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

## Why This Works
- `--legacy-peer-deps` uses npm's older dependency resolution algorithm
- This allows Angular 19 to work with ng2-charts despite the CDK version mismatch
- The functionality remains intact as ng2-charts@4.1.1 is compatible with Angular 19

## Alternative Solution (if needed)
If the above doesn't work, you can force the installation:
```bash
npm install --force
```

## Verification Commands
After installation, verify everything works:
```bash
# Check Angular versions
npm list @angular/core @angular/fire ng2-charts

# Test builds
npm run build:prod
```

## Production Deployment
Once dependencies are resolved, you can proceed with:
```bash
# Build for production
npm run build:prod

# Start with PM2 (if configured)
pm2 start ecosystem.config.js --env production
```
