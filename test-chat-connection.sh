#!/usr/bin/env bash
# test-chat-connection.sh - Test WebSocket/Chat connectivity

echo "🔌 Testing NexPrep Chat Connection"
echo "================================="

# Test Socket.IO endpoint
echo ""
echo "1. Testing Socket.IO HTTP endpoint..."
SOCKETIO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/socket.io/ 2>/dev/null)
echo "Socket.IO endpoint status: $SOCKETIO_STATUS"

if [ "$SOCKETIO_STATUS" = "200" ]; then
    echo "✅ Socket.IO endpoint accessible"
    
    # Get Socket.IO response details
    echo ""
    echo "2. Socket.IO endpoint details:"
    SOCKETIO_RESPONSE=$(curl -s https://nexprepai.com/socket.io/ 2>/dev/null)
    echo "$SOCKETIO_RESPONSE" | head -3
    
    if echo "$SOCKETIO_RESPONSE" | grep -q "\"websocket\""; then
        echo "✅ WebSocket transport available"
    else
        echo "⚠️  WebSocket transport not found in response"
    fi
    
    if echo "$SOCKETIO_RESPONSE" | grep -q "\"polling\""; then
        echo "✅ Polling transport available"
    else
        echo "⚠️  Polling transport not found in response"
    fi
else
    echo "❌ Socket.IO endpoint not accessible (Status: $SOCKETIO_STATUS)"
fi

# Test backend API
echo ""
echo "3. Testing backend API connectivity..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://nexprepai.com/api/ 2>/dev/null)
echo "API endpoint status: $API_STATUS"

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "404" ]; then
    echo "✅ Backend API accessible"
else
    echo "❌ Backend API not accessible (Status: $API_STATUS)"
fi

# Test SSL/TLS
echo ""
echo "4. Testing SSL/TLS configuration..."
SSL_INFO=$(curl -s -I https://nexprepai.com/ 2>/dev/null | grep -i "server\|content-type\|strict-transport")
if [ ! -z "$SSL_INFO" ]; then
    echo "✅ HTTPS/SSL working correctly"
    echo "$SSL_INFO"
else
    echo "⚠️  SSL information not available"
fi

# Test WebSocket upgrade headers
echo ""
echo "5. Testing WebSocket upgrade capability..."
WS_HEADERS=$(curl -s -I -H "Upgrade: websocket" -H "Connection: Upgrade" https://nexprepai.com/socket.io/ 2>/dev/null)
if echo "$WS_HEADERS" | grep -qi "upgrade"; then
    echo "✅ WebSocket upgrade headers supported"
else
    echo "⚠️  WebSocket upgrade headers not found"
fi

# Check PM2 backend status
echo ""
echo "6. Checking backend process status..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"nexprepai-backend".*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$PM2_STATUS" = "online" ]; then
        echo "✅ Backend process is online"
    else
        echo "❌ Backend process status: $PM2_STATUS"
    fi
else
    echo "⚠️  PM2 not available (testing from different server?)"
fi

# Test from browser perspective
echo ""
echo "7. Browser testing recommendations:"
echo ""
echo "Open browser console on https://nexprepai.com and run:"
echo ""
echo "// Test basic Socket.IO connection"
echo "const socket = io('', {"
echo "  transports: ['websocket', 'polling'],"
echo "  timeout: 10000"
echo "});"
echo ""
echo "socket.on('connect', () => {"
echo "  console.log('✅ Socket connected successfully');"
echo "  console.log('Transport:', socket.io.engine.transport.name);"
echo "});"
echo ""
echo "socket.on('connect_error', (err) => {"
echo "  console.error('❌ Socket connection failed:', err);"
echo "});"
echo ""

# Summary
echo "================================="
echo "📊 Connection Test Summary:"
echo ""

if [ "$SOCKETIO_STATUS" = "200" ]; then
    echo "✅ Socket.IO endpoint: WORKING"
else
    echo "❌ Socket.IO endpoint: FAILED"
fi

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "404" ]; then
    echo "✅ Backend API: WORKING"
else
    echo "❌ Backend API: FAILED"
fi

echo ""
echo "🔧 If chat connection still fails:"
echo "1. Check browser console for specific errors"
echo "2. Try incognito/private browsing mode"
echo "3. Clear browser cache completely"
echo "4. Check if browser blocks WebSocket connections"
echo "5. Test on different network/device"
echo ""
echo "📝 Backend logs: pm2 logs nexprepai-backend"
echo "📝 Nginx logs: sudo tail -f /var/log/nginx/error.log"

echo ""
echo "Test completed: $(date)"
