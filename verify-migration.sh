#!/usr/bin/env bash
# verify-migration.sh - Final migration verification script
# This script helps verify that the migration from IP to domain is complete

echo "===== NexPrep Domain Migration Verification ====="
echo "Testing migration from 43.205.88.43 to https://nexprepai.com"
echo ""

# Test 1: Check if any IP references remain in critical files
echo "🔍 Checking for remaining IP references in runtime files..."
echo ""

echo "Frontend environment files:"
if grep -r "43.205" frontend/src/environments/ 2>/dev/null; then
    echo "❌ Found IP references in frontend environment files"
else
    echo "✅ No IP references in frontend environment files"
fi

echo ""
echo "Admin panel environment files:"
if grep -r "43.205" admin-panel/src/environments/ 2>/dev/null; then
    echo "❌ Found IP references in admin panel environment files"
else
    echo "✅ No IP references in admin panel environment files"
fi

echo ""
echo "Backend environment files:"
if grep -r "43.205" backend/.env* 2>/dev/null; then
    echo "❌ Found IP references in backend environment files"
else
    echo "✅ No IP references in backend environment files"
fi

echo ""
echo "Nginx configuration:"
if grep -r "43.205" nginx-production.conf 2>/dev/null; then
    echo "❌ Found IP references in nginx config"
else
    echo "✅ No IP references in nginx config"
fi

echo ""
echo "===== Production Environment Verification ====="
echo ""

# Test 2: Verify frontend environment configuration
echo "Frontend production environment:"
echo "- API URL: $(grep 'apiUrl:' frontend/src/environments/environment.prod.ts)"
echo "- Socket URL: $(grep 'socketUrl:' frontend/src/environments/environment.prod.ts)"

echo ""
echo "Admin panel production environment:"
echo "- API URL: $(grep 'apiUrl:' admin-panel/src/environments/environment.prod.ts)"
echo "- Socket URL: $(grep 'socketUrl:' admin-panel/src/environments/environment.prod.ts)"

echo ""
echo "Backend production environment:"
echo "- ALLOWED_ORIGIN: $(grep 'ALLOWED_ORIGIN' backend/.env.prod)"

echo ""
echo "===== Test URLs to Verify After Deployment ====="
echo ""
echo "After deploying to the server, test these URLs:"
echo ""
echo "🌐 Main Website:"
echo "   https://nexprepai.com/"
echo "   https://nexprepai.com/home"
echo "   https://nexprepai.com/user/vpbgkt"
echo "   https://nexprepai.com/leaderboard/test"
echo ""
echo "🔐 Authentication:"
echo "   https://nexprepai.com/login (should redirect to /home if already logged in)"
echo "   https://nexprepai.com/login?returnUrl=%2Fhome"
echo ""
echo "⚙️ Admin Panel:"
echo "   https://nexprepai.com/admin/"
echo ""
echo "🔌 API Endpoints:"
echo "   https://nexprepai.com/api/"
echo "   https://nexprepai.com/api/enrollments/enrollment-options"
echo "   https://nexprepai.com/api/auth/referral-info"
echo ""
echo "💬 WebSocket/Chat:"
echo "   https://nexprepai.com/socket.io/"
echo ""
echo "===== Manual Testing Steps ====="
echo ""
echo "1. Clear browser cache completely"
echo "2. Test in incognito/private mode"
echo "3. Log in and verify no 'Connection lost' messages in chat"
echo "4. Test public profile links work without login"
echo "5. Test admin panel access"
echo "6. Check browser console for any errors"
echo ""
echo "===== If Issues Persist ====="
echo ""
echo "🔧 Backend Issues:"
echo "   - Check PM2 logs: pm2 logs nexprepai-backend"
echo "   - Verify backend environment: pm2 env nexprepai-backend"
echo "   - Restart backend: pm2 restart nexprepai-backend"
echo ""
echo "🌐 Nginx Issues:"
echo "   - Test config: sudo nginx -t"
echo "   - Check error logs: sudo tail -f /var/log/nginx/error.log"
echo "   - Reload config: sudo systemctl reload nginx"
echo ""
echo "🔍 Debug Commands:"
echo "   - Test local backend: curl http://localhost:5000/api/"
echo "   - Test through Nginx: curl https://nexprepai.com/api/"
echo "   - Check socket.io: curl 'https://nexprepai.com/socket.io/?EIO=4&transport=polling'"
echo ""
echo "✅ Migration verification complete!"
echo ""
echo "📋 Remember to:"
echo "   1. Update backend/.env.prod on the server"
echo "   2. Push all changes to GitHub"
echo "   3. Run deploynp-enhanced.sh on the server"
echo "   4. Test all URLs above"
