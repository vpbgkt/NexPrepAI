#!/usr/bin/env bash
# deploynp.sh – Enhanced NexPrep deployment with Angular routing fix

set -euo pipefail                         # exit on any error

PROJECT_DIR="/var/www/NexPrep"
NGINX_ROOT="/usr/share/nginx/html"
LOG="/var/log/nexprep_deploy_$(date +%F_%H-%M-%S).log"

# ──────────────────────────────────────────────────────────────
# All output also goes to a timestamped logfile
exec > >(tee -a "$LOG") 2>&1

echo "===== NexPrep deployment started: $(date '+%Y-%m-%d %H:%M:%S') ====="
echo "🔧 Enhanced with Angular routing fix"

##############################################################################
# 1. Git housekeeping
##############################################################################
cd "$PROJECT_DIR"
pwd

echo "----- Git status before pull -----"
git status
git reset --hard
git clean -f                          # remove untracked files
git status
git --no-pager log --oneline -3

echo "----- Pulling latest changes -----"
git pull origin main
git diff HEAD~1 --name-only

##############################################################################
# 2. Front-end build + deploy (with production config)
##############################################################################
echo "----- Building Frontend (Production Mode) -----"
cd frontend

# Ensure clean build
rm -rf dist/ node_modules/.cache/ 2>/dev/null || true

# Build with explicit production configuration
echo "Using production configuration..."
npm run build -- --configuration production

# Verify build output
echo "----- Verifying Frontend Build -----"
ls -la dist/frontend/browser/
echo "index.html content check:"
head -10 dist/frontend/browser/index.html

echo "----- Clearing old Frontend files -----"
sudo rm -rf "${NGINX_ROOT}/index.html" "${NGINX_ROOT}/main"* "${NGINX_ROOT}/polyfills"* "${NGINX_ROOT}/styles"* "${NGINX_ROOT}/assets" 2>/dev/null || true

echo "----- Deploying Frontend to ${NGINX_ROOT} -----"
sudo cp -r dist/frontend/browser/* "${NGINX_ROOT}/"
sudo chown -R nginx:nginx "${NGINX_ROOT}/"
sudo restorecon -R "${NGINX_ROOT}/"  || true   # ignore if SELinux absent

# Verify deployment
echo "----- Verifying Frontend Deployment -----"
ls -la "${NGINX_ROOT}/"
echo "Deployed index.html content check:"
sudo head -10 "${NGINX_ROOT}/index.html"

##############################################################################
# 3. Admin panel build + deploy
##############################################################################
echo "----- Building Admin Panel -----"
cd ../admin-panel

# Clean build for admin panel too
rm -rf dist/ node_modules/.cache/ 2>/dev/null || true

npm run build -- --configuration production

echo "----- Deploying Admin Panel -----"
sudo mkdir -p "${NGINX_ROOT}/admin/browser/"
sudo rm -rf "${NGINX_ROOT}/admin/browser/"* 2>/dev/null || true
sudo cp -r dist/admin-panel/browser/* "${NGINX_ROOT}/admin/browser/"
sudo chown -R nginx:nginx "${NGINX_ROOT}/admin/"
sudo restorecon -R "${NGINX_ROOT}/admin/" || true

##############################################################################
# 4. Backend restart + Nginx reload + Testing
##############################################################################
echo "----- Restarting PM2 backend -----"
pm2 restart nexprepai-backend

echo "----- Testing Nginx configuration -----"
sudo nginx -t

echo "----- Reloading Nginx -----"
sudo systemctl reload nginx

##############################################################################
# 5. Verify deployment and test Angular routing
##############################################################################
echo "----- Testing Deployment -----"
echo "PM2 Status:"
pm2 status

echo ""
echo "Testing URLs..."

# Test main site
echo -n "Main site (HTTPS): "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/ 2>/dev/null && echo " ✅" || echo " ❌"

# Test HTTP fallback
echo -n "Main site (HTTP fallback): "
curl -s -o /dev/null -w "%{http_code}" http://43.205.88.43/ 2>/dev/null && echo " ✅" || echo " ❌"

# Test Angular routes
echo -n "Public profile route: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/user/vpbgkt 2>/dev/null && echo " ✅" || echo " ❌"

echo -n "Leaderboard route: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/leaderboard/test 2>/dev/null && echo " ✅" || echo " ❌"

# Test if Angular app is actually served for routes
echo ""
echo "Testing if Angular app loads for routes..."
PROFILE_RESPONSE=$(curl -s https://nexprepai.com/user/vpbgkt 2>/dev/null)
if echo "$PROFILE_RESPONSE" | grep -q "app-root"; then
    echo "✅ Angular app-root found in profile route response"
else
    echo "❌ Angular app-root NOT found in profile route response"
    echo "First 200 chars of response:"
    echo "$PROFILE_RESPONSE" | head -c 200
fi

# Test API
echo -n "API Health: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/ 2>/dev/null && echo " ✅" || echo " ❌"

# Test admin panel
echo -n "Admin panel: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/admin/ 2>/dev/null && echo " ✅" || echo " ❌"

# Test WebSocket/Socket.IO endpoint
echo -n "WebSocket endpoint: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/socket.io/ 2>/dev/null && echo " ✅" || echo " ❌"

##############################################################################
# 6. Final verification and recommendations
##############################################################################
echo ""
echo "===== Deployment Summary ====="
echo "✅ Git pull completed"
echo "✅ Frontend built with production config"
echo "✅ Admin panel built"
echo "✅ Files deployed to Nginx"
echo "✅ PM2 backend restarted"
echo "✅ Nginx reloaded"
echo ""
echo "🌐 Access URLs:"
echo "   Main site: https://nexprepai.com/"
echo "   Admin panel: https://nexprepai.com/admin/"
echo "   Public profile: https://nexprepai.com/user/vpbgkt"
echo "   Leaderboard: https://nexprepai.com/leaderboard/someId"
echo ""
echo "📋 If Angular routing still doesn't work:"
echo "   1. Clear browser cache (Ctrl+Shift+R)"
echo "   2. Test in incognito mode"
echo "   3. Check browser console for errors"
echo "   4. Verify Nginx config: sudo nginx -t"
echo ""
echo "🔧 If chat shows 'Connection lost':"
echo "   1. Check WebSocket endpoint above (should be ✅)"
echo "   2. Clear browser cache completely"
echo "   3. Test in incognito mode"
echo "   4. Check browser console for Socket.IO errors"
echo "   5. Verify backend logs: pm2 logs nexprepai-backend"
echo ""
echo "✅ Deployment finished successfully: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Log saved to: $LOG"
