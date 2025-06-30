#!/usr/bin/env bash
# fix-https-config.sh - Quick fix for HTTPS domain configuration issues

echo "===== Quick HTTPS Configuration Fix ====="
echo "This script will update configurations for https://nexprepai.com"
echo ""

PROJECT_DIR="/var/www/NexPrep"
cd "$PROJECT_DIR"

##############################################################################
# 1. Fix environment files
##############################################################################
echo "1. Fixing environment files..."

# Frontend environment
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

# Admin panel environment
cat > admin-panel/src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api',  // Uses HTTPS domain with Nginx proxy
  socketUrl: ''  // Uses same origin (HTTPS) - let Nginx handle proxy
};
EOF

echo "✅ Environment files updated"

##############################################################################
# 2. Update ecosystem.config.js for HTTPS
##############################################################################
echo "2. Updating PM2 ecosystem configuration..."

# Update ALLOWED_ORIGIN in ecosystem.config.js
sed -i "s|ALLOWED_ORIGIN: 'http://43.205.88.43,http://43.205.88.43/admin'|ALLOWED_ORIGIN: 'https://nexprepai.com,https://nexprepai.com/admin,https://www.nexprepai.com,https://www.nexprepai.com/admin'|g" ecosystem.config.js

echo "✅ Ecosystem configuration updated"

##############################################################################
# 3. Check Nginx configuration
##############################################################################
echo "3. Checking Nginx configuration..."

# Check if nginx config has the correct domain
if grep -q "nexprepai.com" /etc/nginx/sites-available/default 2>/dev/null; then
    echo "✅ Nginx already configured for nexprepai.com"
else
    echo "❌ Nginx needs manual configuration for nexprepai.com"
    echo "Please update /etc/nginx/sites-available/default to use server_name nexprepai.com"
fi

##############################################################################
# 4. Restart services
##############################################################################
echo "4. Restarting services..."

# Restart PM2 with new environment
echo "Restarting PM2 backend..."
pm2 restart nexprepai-backend

# Test nginx config and reload
echo "Testing and reloading Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration has errors"
fi

##############################################################################
# 5. Quick tests
##############################################################################
echo "5. Running quick tests..."

sleep 3  # Wait for services to start

echo "Testing main site..."
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/ 2>/dev/null)
echo "Main site status: $MAIN_STATUS"

echo "Testing API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/ 2>/dev/null)
echo "API status: $API_STATUS"

echo "Testing WebSocket..."
SOCKET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/socket.io/ 2>/dev/null)
echo "WebSocket status: $SOCKET_STATUS"

##############################################################################
# 6. Summary
##############################################################################
echo ""
echo "===== Configuration Fix Summary ====="
echo "✅ Frontend environment updated for HTTPS"
echo "✅ Admin panel environment updated for HTTPS"
echo "✅ PM2 ecosystem ALLOWED_ORIGIN updated"
echo "✅ Services restarted"
echo ""
echo "🌐 Your site should now be accessible at:"
echo "   Main site: https://nexprepai.com/"
echo "   Admin panel: https://nexprepai.com/admin/"
echo ""
echo "🔧 If issues persist:"
echo "   1. Clear browser cache completely"
echo "   2. Test in incognito mode"
echo "   3. Run: ./diagnose-https-issues.sh"
echo "   4. Check browser console for errors"
echo ""
echo "📋 Next steps:"
echo "   1. Test login/logout functionality"
echo "   2. Test chat system"
echo "   3. Verify all API endpoints work"
echo "   4. Test Angular routing on different pages"
echo ""
echo "===== Fix Complete ====="
