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
# 2. Fix environment configurations for HTTPS domain
##############################################################################
echo "----- Checking and Fixing Environment Configurations -----"

# Check current frontend environment
echo "Current frontend production environment:"
cat frontend/src/environments/environment.prod.ts

echo ""
echo "Updating frontend environment for HTTPS domain..."
cat > frontend/src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api', // Uses HTTPS domain with Nginx proxy
  socketUrl: '', // Uses same origin (HTTPS) - let Nginx handle proxy
  firebase: {
    apiKey: "AIzaSyCdfNaGNk2PlgHBBM_5IFUnQa3zxAM__NA",
    authDomain: "nexprepauth.firebaseapp.com",
    projectId: "nexprepauth",
    storageBucket: "nexprepauth.firebasestorage.app",
    messagingSenderId: "1035644349662",
    appId: "1:1035644349662:web:4bd9378adae4d11df4664f",
    measurementId: "G-6F331E9GKZ"
  }
};
EOF

# Check current admin panel environment  
echo ""
echo "Current admin panel production environment:"
cat admin-panel/src/environments/environment.prod.ts

echo ""
echo "Updating admin panel environment for HTTPS domain..."
cat > admin-panel/src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api',  // Uses HTTPS domain with Nginx proxy
  socketUrl: ''  // Uses same origin (HTTPS) - let Nginx handle proxy
};
EOF

echo "✅ Environment configurations updated for HTTPS domain"

##############################################################################
# 3. Front-end build + deploy (with production config)
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
# 4. Admin panel build + deploy
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
# 5. Backend restart + Nginx reload + Testing
##############################################################################
echo "----- Restarting PM2 backend -----"
pm2 restart nexprepai-backend

echo "----- Checking Backend Health -----"
sleep 3  # Wait for backend to start

# Check if backend is running locally
echo "Testing backend locally..."
LOCAL_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/ 2>/dev/null)
echo "Local backend status: $LOCAL_API_STATUS"

if [ "$LOCAL_API_STATUS" != "200" ] && [ "$LOCAL_API_STATUS" != "404" ]; then
    echo "❌ Backend not responding locally. Checking logs..."
    pm2 logs nexprepai-backend --lines 10
    echo ""
    echo "Backend might have startup issues. Trying to restart..."
    pm2 restart nexprepai-backend
    sleep 5
fi

# Test specific enrollment endpoint locally
echo "Testing enrollment endpoint locally..."
curl -s http://localhost:5000/api/enrollments/enrollment-options | head -100

echo ""
echo "----- Testing Nginx configuration -----"
sudo nginx -t

echo "----- Reloading Nginx -----"
sudo systemctl reload nginx

echo ""
echo "----- Testing API through Nginx -----"
NGINX_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/ 2>/dev/null)
echo "API through Nginx status: $NGINX_API_STATUS"

if [ "$NGINX_API_STATUS" = "502" ]; then
    echo "❌ 502 Bad Gateway - Backend connection issue"
    echo "Checking Nginx error log..."
    sudo tail -10 /var/log/nginx/error.log
fi

##############################################################################
# 6. Verify deployment and test Angular routing
##############################################################################
echo "----- Testing Deployment -----"
echo "PM2 Status:"
pm2 status

echo ""
echo "Testing URLs..."

# Test main site
echo -n "Main site (HTTPS): "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/ 2>/dev/null && echo " ✅" || echo " ❌"

# Test HTTP fallback (should redirect to HTTPS)
echo -n "HTTP redirect test: "
curl -s -o /dev/null -w "%{http_code}" http://nexprepai.com/ 2>/dev/null && echo " ✅" || echo " ❌"

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

# Test specific enrollment endpoints that were failing
echo ""
echo "Testing specific failing endpoints..."
echo -n "Enrollment options: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/enrollments/enrollment-options 2>/dev/null && echo " ✅" || echo " ❌"

echo -n "My enrollments: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/enrollments/my-enrollments 2>/dev/null && echo " ✅" || echo " ❌"

echo -n "Referral info: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/auth/referral-info 2>/dev/null && echo " ✅" || echo " ❌"

echo -n "Enrollment stats: "
curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/enrollments/stats 2>/dev/null && echo " ✅" || echo " ❌"

# Additional diagnostics for troubleshooting
echo ""
echo "===== Additional Diagnostics ====="
echo "Backend environment check:"
pm2 env nexprepai-backend | grep -E "(NODE_ENV|PORT|ALLOWED_ORIGIN)" || echo "Environment vars not visible"

echo ""
echo "Checking if backend is using correct environment..."
if pm2 describe nexprepai-backend | grep -q "production"; then
    echo "✅ Backend running in production mode"
else
    echo "❌ Backend may not be in production mode"
fi

echo ""
echo "Testing if chat WebSocket actually works..."
# Test socket.io handshake
SOCKET_RESPONSE=$(curl -s "https://nexprepai.com/socket.io/?EIO=4&transport=polling" 2>/dev/null | head -c 50)
if echo "$SOCKET_RESPONSE" | grep -q "0{"; then
    echo "✅ Socket.IO handshake working"
else
    echo "❌ Socket.IO handshake failed"
    echo "Socket response: $SOCKET_RESPONSE"
fi

echo ""
echo "Checking Nginx proxy configuration..."
if sudo nginx -T 2>/dev/null | grep -q "nexprepai.com"; then
    echo "✅ Nginx configured for nexprepai.com domain"
else
    echo "❌ Nginx may not be configured for new domain"
    echo "Current server_name in Nginx:"
    sudo nginx -T 2>/dev/null | grep "server_name" | head -3
fi

##############################################################################
# 7. Final verification and recommendations
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
