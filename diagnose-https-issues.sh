#!/usr/bin/env bash
# diagnose-https-issues.sh - Comprehensive diagnostics for HTTPS domain migration

echo "===== NexPrep HTTPS Domain Migration Diagnostics ====="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

##############################################################################
# 1. Environment Configuration Check
##############################################################################
echo "1. CHECKING ENVIRONMENT CONFIGURATIONS"
echo "========================================="

echo "Frontend environment.prod.ts:"
if [ -f "/var/www/NexPrep/frontend/src/environments/environment.prod.ts" ]; then
    cat /var/www/NexPrep/frontend/src/environments/environment.prod.ts
else
    echo "❌ Frontend environment.prod.ts not found"
fi

echo ""
echo "Admin panel environment.prod.ts:"
if [ -f "/var/www/NexPrep/admin-panel/src/environments/environment.prod.ts" ]; then
    cat /var/www/NexPrep/admin-panel/src/environments/environment.prod.ts
else
    echo "❌ Admin panel environment.prod.ts not found"
fi

echo ""
echo "Backend ecosystem.config.js ALLOWED_ORIGIN:"
if [ -f "/var/www/NexPrep/ecosystem.config.js" ]; then
    grep -A 2 -B 2 "ALLOWED_ORIGIN" /var/www/NexPrep/ecosystem.config.js
else
    echo "❌ ecosystem.config.js not found"
fi

##############################################################################
# 2. SSL/HTTPS Configuration Check
##############################################################################
echo ""
echo "2. SSL/HTTPS CONFIGURATION CHECK"
echo "================================="

echo "Checking SSL certificate status:"
echo | openssl s_client -servername nexprepai.com -connect nexprepai.com:443 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "❌ SSL certificate check failed"

echo ""
echo "Nginx SSL configuration:"
sudo nginx -T 2>/dev/null | grep -A 10 -B 5 "ssl\|443" | head -20

echo ""
echo "Testing HTTPS redirect:"
HTTP_REDIRECT=$(curl -s -I http://nexprepai.com/ 2>/dev/null | grep -i "location.*https")
if [ -n "$HTTP_REDIRECT" ]; then
    echo "✅ HTTP to HTTPS redirect configured: $HTTP_REDIRECT"
else
    echo "❌ HTTP to HTTPS redirect not working"
fi

##############################################################################
# 3. Backend Service Check
##############################################################################
echo ""
echo "3. BACKEND SERVICE CHECK"
echo "========================"

echo "PM2 status:"
pm2 status

echo ""
echo "Backend logs (last 10 lines):"
pm2 logs nexprepai-backend --lines 10

echo ""
echo "Backend local health check:"
curl -s -v http://localhost:5000/api/ 2>&1 | head -20

echo ""
echo "Backend environment variables:"
pm2 env nexprepai-backend 2>/dev/null | grep -E "(NODE_ENV|PORT|ALLOWED_ORIGIN|MONGO)" || echo "Environment vars not accessible"

##############################################################################
# 4. Nginx Configuration Check
##############################################################################
echo ""
echo "4. NGINX CONFIGURATION CHECK"
echo "============================="

echo "Nginx configuration test:"
sudo nginx -t

echo ""
echo "Nginx server blocks:"
sudo nginx -T 2>/dev/null | grep -A 20 "server {" | head -40

echo ""
echo "Nginx error log (last 10 lines):"
sudo tail -10 /var/log/nginx/error.log

echo ""
echo "Nginx access log (last 5 lines):"
sudo tail -5 /var/log/nginx/access.log

##############################################################################
# 5. DNS and Network Check
##############################################################################
echo ""
echo "5. DNS AND NETWORK CHECK"
echo "========================"

echo "DNS resolution for nexprepai.com:"
nslookup nexprepai.com || echo "❌ DNS resolution failed"

echo ""
echo "Testing domain connectivity:"
ping -c 3 nexprepai.com || echo "❌ Ping failed"

echo ""
echo "Port 443 (HTTPS) connectivity:"
nc -zv nexprepai.com 443 2>&1 || echo "❌ Port 443 not reachable"

echo ""
echo "Port 80 (HTTP) connectivity:"
nc -zv nexprepai.com 80 2>&1 || echo "❌ Port 80 not reachable"

##############################################################################
# 6. Application-Specific Tests
##############################################################################
echo ""
echo "6. APPLICATION-SPECIFIC TESTS"
echo "=============================="

echo "Testing main endpoints:"
for endpoint in "/" "/api/" "/admin/" "/socket.io/" "/user/vpbgkt" "/leaderboard/test"; do
    echo -n "  $endpoint: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://nexprepai.com$endpoint" 2>/dev/null)
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "404" ]; then
        echo "✅ $STATUS"
    else
        echo "❌ $STATUS"
    fi
done

echo ""
echo "Testing Socket.IO WebSocket connection:"
SOCKET_TEST=$(curl -s "https://nexprepai.com/socket.io/?EIO=4&transport=polling" 2>/dev/null)
if echo "$SOCKET_TEST" | grep -q "0{"; then
    echo "✅ Socket.IO handshake successful"
else
    echo "❌ Socket.IO handshake failed"
    echo "Response: ${SOCKET_TEST:0:100}..."
fi

echo ""
echo "Testing API endpoints that were problematic:"
for endpoint in "/api/enrollments/enrollment-options" "/api/enrollments/my-enrollments" "/api/auth/referral-info" "/api/enrollments/stats"; do
    echo -n "  $endpoint: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://nexprepai.com$endpoint" 2>/dev/null)
    echo "$STATUS"
done

##############################################################################
# 7. Browser Cache and CORS Check
##############################################################################
echo ""
echo "7. CORS AND BROWSER COMPATIBILITY CHECK"
echo "======================================="

echo "Testing CORS headers:"
curl -H "Origin: https://nexprepai.com" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS https://nexprepai.com/api/ -v 2>&1 | grep -i "access-control" || echo "❌ CORS headers not found"

echo ""
echo "Testing Angular app delivery:"
ANGULAR_RESPONSE=$(curl -s https://nexprepai.com/ 2>/dev/null)
if echo "$ANGULAR_RESPONSE" | grep -q "app-root"; then
    echo "✅ Angular app being served correctly"
else
    echo "❌ Angular app not being served correctly"
    echo "Response preview:"
    echo "$ANGULAR_RESPONSE" | head -5
fi

##############################################################################
# 8. Recommendations
##############################################################################
echo ""
echo "8. TROUBLESHOOTING RECOMMENDATIONS"
echo "=================================="

echo "If you're still experiencing issues:"
echo ""
echo "🔧 For Angular routing issues:"
echo "   1. Clear browser cache completely (Ctrl+Shift+Del)"
echo "   2. Test in incognito/private mode"
echo "   3. Check browser console for JavaScript errors"
echo "   4. Verify index.html is being served for all routes"
echo ""
echo "🔧 For API/Backend issues:"
echo "   1. Check PM2 logs: pm2 logs nexprepai-backend"
echo "   2. Restart backend: pm2 restart nexprepai-backend"
echo "   3. Check MongoDB connection"
echo "   4. Verify CORS settings in backend"
echo ""
echo "🔧 For SSL/HTTPS issues:"
echo "   1. Check SSL certificate installation"
echo "   2. Verify domain DNS settings"
echo "   3. Check firewall rules for ports 80 and 443"
echo "   4. Test with curl -k (ignore SSL errors)"
echo ""
echo "🔧 For chat/WebSocket issues:"
echo "   1. Clear browser cache and cookies"
echo "   2. Check browser's WebSocket support"
echo "   3. Verify Socket.IO endpoint is accessible"
echo "   4. Check for proxy/firewall blocking WebSockets"
echo ""
echo "===== Diagnostics Complete ====="
