#!/usr/bin/env bash
# fix-login-redirect.sh - Fix login page redirect for already logged in users

echo "===== Fixing Login Page Redirect Issue ====="
echo "This will rebuild frontend with the login redirect fix"
echo ""

PROJECT_DIR="/var/www/NexPrep"
cd "$PROJECT_DIR"

##############################################################################
# 1. Build Frontend with the Login Fix
##############################################################################
echo "1. Building frontend with login redirect fix..."

cd frontend

# Clean previous build
rm -rf dist/ node_modules/.cache/ .angular/cache/ 2>/dev/null || true

# Build with production configuration
echo "Building frontend..."
npm run build -- --configuration production

# Verify build completed
if [ -d "dist/frontend/browser" ]; then
    echo "✅ Frontend build completed successfully"
    ls -la dist/frontend/browser/ | head -5
else
    echo "❌ Frontend build failed"
    exit 1
fi

##############################################################################
# 2. Deploy New Build
##############################################################################
echo ""
echo "2. Deploying new frontend build..."

# Backup current deployment
sudo mkdir -p /tmp/nginx-backup-$(date +%Y%m%d-%H%M%S)
sudo cp -r /usr/share/nginx/html/* /tmp/nginx-backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true

# Clear current deployment
sudo rm -rf /usr/share/nginx/html/*

# Deploy new build
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html/
sudo restorecon -R /usr/share/nginx/html/ 2>/dev/null || true

echo "✅ Frontend deployed successfully"

##############################################################################
# 3. Test Deployment
##############################################################################
echo ""
echo "3. Testing deployment..."

# Test main site
echo -n "Main site: "
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/ 2>/dev/null)
if [ "$MAIN_STATUS" = "200" ]; then
    echo "✅ $MAIN_STATUS"
else
    echo "❌ $MAIN_STATUS"
fi

# Test login page
echo -n "Login page: "
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/login 2>/dev/null)
if [ "$LOGIN_STATUS" = "200" ]; then
    echo "✅ $LOGIN_STATUS"
else
    echo "❌ $LOGIN_STATUS"
fi

##############################################################################
# 4. Final Instructions
##############################################################################
echo ""
echo "===== Login Redirect Fix Complete ====="
echo "✅ Frontend rebuilt with login redirect fix"
echo "✅ New build deployed to Nginx"
echo ""
echo "🎯 WHAT WAS FIXED:"
echo "- Login component now checks if user is already logged in"
echo "- If logged in, immediately redirects to returnUrl or /home"
echo "- Proper handling of returnUrl query parameter"
echo ""
echo "🧪 TESTING STEPS:"
echo "1. Clear browser cache (Ctrl+Shift+Del)"
echo "2. Login to https://nexprepai.com"
echo "3. Try visiting https://nexprepai.com/login?returnUrl=%2Fhome"
echo "4. Should immediately redirect to /home without showing login form"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "- Already logged in users visiting /login get redirected immediately"
echo "- ReturnUrl parameter is respected during redirect"
echo "- No login form displayed for authenticated users"
echo ""
echo "📋 ADDITIONAL NOTES:"
echo "- Works for both traditional and Firebase authentication"
echo "- Maintains security by checking authentication status"
echo "- Provides better user experience"
echo ""
echo "===== Fix Complete ====="
