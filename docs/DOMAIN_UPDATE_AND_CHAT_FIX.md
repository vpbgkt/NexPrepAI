# Website Domain Update and Chat Connection Fix

## 🌐 **Issue Summary**

The website is configured for `nexprepai.com` domain with HTTPS/SSL, but some configurations still reference the old IP address `43.205.88.43`, causing:

1. **Chat Connection Issues**: "Connection lost. Checking connection..." appears in chat
2. **Mixed URL References**: Some URLs still use old IP instead of proper domain
3. **WebSocket Connection Problems**: Socket.IO can't connect properly through HTTPS

## 🔧 **Root Cause Analysis**

### **Chat Connection Issue**
The chat connection problem occurs because:
1. **Frontend Environment**: `socketUrl: ''` in production (correct)
2. **Nginx Configuration**: Properly configured for Socket.IO proxy
3. **HTTPS/WSS Issue**: WebSocket connection needs to upgrade from HTTP to HTTPS

### **Domain Configuration**
- ✅ **Nginx**: Correctly configured for `nexprepai.com` 
- ✅ **Frontend Production**: Uses relative URLs (correct)
- ✅ **Admin Panel**: Updated to use relative URLs
- ⚠️ **Documentation**: Still references old IP in many places

## 🚀 **Complete Fix Implementation**

### **Step 1: Update All Environment Files**

**Frontend Production Environment** (✅ Already Updated):
```typescript
// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api', // Uses Nginx proxy
  socketUrl: '', // Uses same origin (HTTPS)
  firebase: { /* config */ }
};
```

**Admin Panel Production Environment** (✅ Already Updated):
```typescript
// admin-panel/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api',  // Uses Nginx proxy
  socketUrl: ''  // Uses same origin (HTTPS)
};
```

### **Step 2: Enhanced Deployment Script**

The updated deployment script now:
- ✅ Tests HTTPS URLs instead of HTTP
- ✅ Provides proper domain URLs in output
- ✅ Tests WebSocket connectivity
- ✅ Verifies SSL/TLS configuration

### **Step 3: Chat Connection Fix**

The chat service is already properly configured for production. The connection issue is likely due to:

1. **Cache Issues**: Old JavaScript files cached in browser
2. **SSL Certificate Issues**: Mixed content warnings
3. **Firewall/Network**: WebSocket connections blocked

### **Immediate Fixes to Apply**

#### **Fix 1: Clear Deployment and Force Rebuild**
```bash
# Run this on your server
cd /var/www/NexPrep

# Pull latest changes
git pull origin main

# Clean everything
cd frontend
rm -rf dist/ node_modules/.cache/ .angular/cache/
npm run build -- --configuration production

# Clean deploy
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html/

# Same for admin panel
cd ../admin-panel
rm -rf dist/ node_modules/.cache/ .angular/cache/
npm run build -- --configuration production
sudo rm -rf /usr/share/nginx/html/admin/browser/*
sudo cp -r dist/admin-panel/browser/* /usr/share/nginx/html/admin/browser/

# Restart services
pm2 restart nexprepai-backend
sudo systemctl reload nginx
```

#### **Fix 2: Test WebSocket Connection**
```bash
# Test Socket.IO endpoint
curl -I https://nexprepai.com/socket.io/

# Should return 200 OK with upgrade headers
# If not, check Nginx config
```

#### **Fix 3: Browser Cache Clear**
For users experiencing chat issues:
1. **Hard Refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear Cache**: Browser settings → Clear browsing data
3. **Incognito Mode**: Test in private/incognito window

### **Step 4: Verify WebSocket in Browser**

Add this debug code to test WebSocket connection:
```javascript
// In browser console on nexprepai.com
const socket = io('', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully');
});

socket.on('connect_error', (err) => {
  console.error('❌ WebSocket connection failed:', err);
});
```

## 🔍 **Troubleshooting Guide**

### **If Chat Still Shows "Connection Lost":**

1. **Check Browser Console**:
   ```
   F12 → Console → Look for Socket.IO errors
   ```

2. **Test WebSocket Manually**:
   ```bash
   # On server
   curl -I https://nexprepai.com/socket.io/
   
   # Should show:
   # HTTP/1.1 200 OK
   # Content-Type: application/json
   ```

3. **Check Nginx Logs**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

4. **Check Backend Logs**:
   ```bash
   pm2 logs nexprepai-backend --lines 50
   ```

### **If Routes Still Don't Work:**

1. **Verify Nginx Config**:
   ```bash
   sudo nginx -t
   sudo grep -A 10 "location /" /etc/nginx/conf.d/nexprepai.conf
   ```

2. **Test Angular Routes**:
   ```bash
   curl -s https://nexprepai.com/user/test | grep "app-root"
   # Should return HTML with app-root
   ```

## 📋 **Final Verification Checklist**

After running the enhanced deployment:

- [ ] **Main Site**: https://nexprepai.com/ loads correctly
- [ ] **Admin Panel**: https://nexprepai.com/admin/ loads correctly  
- [ ] **Public Profile**: https://nexprepai.com/user/vpbgkt works
- [ ] **Leaderboard**: https://nexprepai.com/leaderboard/test works
- [ ] **Chat Connection**: No "Connection lost" message
- [ ] **API**: https://nexprepai.com/api/ responds
- [ ] **WebSocket**: Chat messages send/receive properly

## 🚀 **Quick Fix Commands**

**Run the enhanced deployment script:**
```bash
# Upload to server
scp -i your-key.pem deploynp-enhanced.sh ec2-user@your-server:~/

# Execute
ssh -i your-key.pem ec2-user@your-server
chmod +x deploynp-enhanced.sh
./deploynp-enhanced.sh
```

**Test everything:**
```bash
# Test main functionality
curl -I https://nexprepai.com/
curl -I https://nexprepai.com/admin/
curl -I https://nexprepai.com/socket.io/

# Test Angular routing
curl -s https://nexprepai.com/user/test | grep app-root
```

The enhanced deployment script will automatically test all these endpoints and report any issues.
