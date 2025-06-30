#!/usr/bin/env bash
# test-angular-routing.sh - Test Angular routing on production server

echo "🧪 Testing Angular Routing on Production Server"
echo "==============================================="

# Test different routes and check if they return Angular app
test_route() {
    local route="$1"
    local description="$2"
    
    echo ""
    echo "Testing: $description"
    echo "URL: http://43.205.88.43$route"
    
    # Get HTTP status code
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://43.205.88.43$route" 2>/dev/null)
    echo "Status code: $status_code"
    
    if [ "$status_code" = "200" ]; then
        # Check if response contains Angular app
        local response=$(curl -s "http://43.205.88.43$route" 2>/dev/null)
        
        if echo "$response" | grep -q "app-root"; then
            echo "✅ SUCCESS: Angular app found"
        else
            echo "❌ FAIL: Angular app NOT found"
            echo "Response preview (first 300 chars):"
            echo "$response" | head -c 300
            echo ""
        fi
        
        # Check for specific Angular indicators
        if echo "$response" | grep -q "ng-version"; then
            echo "✅ Angular framework detected"
        fi
        
        # Check base href
        local base_href=$(echo "$response" | grep -o '<base href="[^"]*"' | head -1)
        if [ ! -z "$base_href" ]; then
            echo "✅ Base href found: $base_href"
        else
            echo "⚠️  Base href not found"
        fi
        
    else
        echo "❌ FAIL: HTTP $status_code"
    fi
}

# Test various routes
test_route "/" "Home page"
test_route "/user/vpbgkt" "Public profile"
test_route "/leaderboard/test123" "Leaderboard"
test_route "/login" "Login page"
test_route "/nonexistent-route" "Non-existent route (should fallback to index.html)"

echo ""
echo "🔍 Additional Checks"
echo "===================="

echo ""
echo "1. Checking if main JavaScript files are accessible:"
# Try to access main JS files
curl -s -o /dev/null -w "main.js: %{http_code}\n" http://43.205.88.43/main.js 2>/dev/null || echo "main.js: Not found"

echo ""
echo "2. Checking Nginx document root contents:"
echo "Files in /usr/share/nginx/html/:"
ssh -i ~/.ssh/your-key.pem ec2-user@43.205.88.43 "sudo ls -la /usr/share/nginx/html/" 2>/dev/null || echo "Cannot access server files"

echo ""
echo "3. Testing HTTPS routes (if SSL is configured):"
test_route_https() {
    local route="$1"
    local description="$2"
    
    echo "HTTPS test: $description"
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" -k "https://nexprepai.com$route" 2>/dev/null)
    echo "HTTPS Status: $status_code"
}

test_route_https "/" "HTTPS Home"
test_route_https "/user/vpbgkt" "HTTPS Public Profile"

echo ""
echo "📋 Summary and Next Steps"
echo "========================"
echo ""
echo "If routes are failing:"
echo "1. 🔄 Run the enhanced deployment script: ./deploynp-enhanced.sh"
echo "2. 🧹 Clear browser cache completely"
echo "3. 🕵️ Test in incognito/private browsing mode"
echo "4. 🔍 Check browser console for JavaScript errors"
echo "5. 📝 Verify Nginx config has: try_files \$uri \$uri/ /index.html;"
echo ""
echo "If status is 200 but Angular app not found:"
echo "1. 🏗️ Rebuild frontend with: npm run build -- --configuration production"
echo "2. 📁 Redeploy files to: /usr/share/nginx/html/"
echo "3. 🔧 Check if build output includes index.html with app-root"
echo ""

echo "Test completed: $(date)"
