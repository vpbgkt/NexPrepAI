# HTTPS Domain Migration Complete Guide

## Overview
This guide covers the complete migration from `http://43.205.88.43` to `https://nexprepai.com` for the NexPrep application.

## ✅ Completed Configurations

### 1. Environment Files Updated
- **Frontend**: `frontend/src/environments/environment.prod.ts`
  - `apiUrl: '/api'` (relative path for Nginx proxy)
  - `socketUrl: ''` (same-origin for HTTPS)

- **Admin Panel**: `admin-panel/src/environments/environment.prod.ts`
  - `apiUrl: '/api'` (relative path for Nginx proxy)
  - `socketUrl: ''` (same-origin for HTTPS)

### 2. Backend Configuration Updated
- **ecosystem.config.js**: ALLOWED_ORIGIN updated to include HTTPS domains
- **PM2**: Backend configured for production with HTTPS origins

### 3. Deployment Scripts Enhanced
- **deploynp-enhanced.sh**: Complete deployment with HTTPS testing
- **fix-https-config.sh**: Quick configuration fix script
- **diagnose-https-issues.sh**: Comprehensive diagnostics

## 🚀 Deployment Process

### Option 1: Enhanced Deployment (Recommended)
```bash
# Upload the enhanced deployment script to server
scp -i your-key.pem deploynp-enhanced.sh user@nexprepai.com:~/
ssh -i your-key.pem user@nexprepai.com

# Run enhanced deployment
chmod +x deploynp-enhanced.sh
sudo ./deploynp-enhanced.sh
```

### Option 2: Quick Configuration Fix
```bash
# If you just need to fix configurations
chmod +x fix-https-config.sh
sudo ./fix-https-config.sh
```

### Option 3: Manual Steps
```bash
# 1. Update environment files
cd /var/www/NexPrep

# Frontend environment
cat > frontend/src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api',
  socketUrl: '',
  firebase: { /* firebase config */ }
};
EOF

# Admin panel environment
cat > admin-panel/src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api',
  socketUrl: ''
};
EOF

# 2. Build and deploy
cd frontend && npm run build -- --configuration production
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/

cd ../admin-panel && npm run build -- --configuration production
sudo cp -r dist/admin-panel/browser/* /usr/share/nginx/html/admin/browser/

# 3. Restart services
pm2 restart nexprepai-backend
sudo systemctl reload nginx
```

## 🔍 Testing & Verification

### Critical URLs to Test
- ✅ Main Site: `https://nexprepai.com/`
- ✅ API Health: `https://nexprepai.com/api/`
- ✅ Admin Panel: `https://nexprepai.com/admin/`
- ✅ WebSocket: `https://nexprepai.com/socket.io/`
- ✅ Angular Routes: `https://nexprepai.com/user/vpbgkt`
- ✅ Leaderboard: `https://nexprepai.com/leaderboard/test`

### Browser Testing Checklist
1. **Clear Cache**: Ctrl+Shift+Del (clear everything)
2. **Incognito Mode**: Test in private browsing
3. **Console Check**: Look for JavaScript/network errors
4. **Login/Logout**: Test authentication flow
5. **Chat System**: Verify WebSocket connection
6. **Angular Routing**: Navigate between different pages

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. 502 Bad Gateway
```bash
# Check backend status
pm2 status
pm2 logs nexprepai-backend

# Restart backend
pm2 restart nexprepai-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### 2. Angular Routing Issues
```bash
# Verify index.html is served for all routes
curl -s https://nexprepai.com/user/test | grep "app-root"

# Check Nginx configuration
sudo nginx -T | grep "try_files"
```

#### 3. Chat "Connection Lost"
```bash
# Test WebSocket endpoint
curl -s "https://nexprepai.com/socket.io/?EIO=4&transport=polling"

# Check CORS headers
curl -H "Origin: https://nexprepai.com" -X OPTIONS https://nexprepai.com/api/ -v
```

#### 4. SSL/HTTPS Issues
```bash
# Test SSL certificate
echo | openssl s_client -servername nexprepai.com -connect nexprepai.com:443

# Test HTTP to HTTPS redirect
curl -I http://nexprepai.com/
```

### Diagnostic Scripts
```bash
# Run comprehensive diagnostics
chmod +x diagnose-https-issues.sh
./diagnose-https-issues.sh

# Quick configuration check
./fix-https-config.sh
```

## 📋 Manual Server Configuration

### If Environment Files Are Git-Ignored
```bash
# SSH to server
ssh -i your-key.pem user@server-ip

# Update frontend environment
sudo nano /var/www/NexPrep/frontend/src/environments/environment.prod.ts
# Set: apiUrl: '/api', socketUrl: ''

# Update admin panel environment  
sudo nano /var/www/NexPrep/admin-panel/src/environments/environment.prod.ts
# Set: apiUrl: '/api', socketUrl: ''

# Update ecosystem.config.js
sudo nano /var/www/NexPrep/ecosystem.config.js
# Set: ALLOWED_ORIGIN: 'https://nexprepai.com,https://nexprepai.com/admin'
```

### Nginx Configuration Check
```bash
# Verify server_name is set correctly
sudo nano /etc/nginx/sites-available/default
# Should include: server_name nexprepai.com www.nexprepai.com;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## 🎯 Success Indicators

### All Green ✅
- Main site loads with HTTPS
- API endpoints return 200/404 (not 502)
- Admin panel accessible
- WebSocket endpoint responsive
- Angular routing works (no 404 on refresh)
- Chat system connects without "Connection lost"

### Browser Console Clean
- No CORS errors
- No mixed content warnings
- No 404 errors for static assets
- WebSocket connects successfully

## 📞 Support Commands

### Quick Status Check
```bash
pm2 status
sudo systemctl status nginx
curl -I https://nexprepai.com/
curl -I https://nexprepai.com/api/
```

### Emergency Rollback
```bash
# If new domain has issues, temporarily restore IP access
sudo sed -i 's/nexprepai.com/43.205.88.43/g' /etc/nginx/sites-available/default
sudo systemctl reload nginx
```

### Log Monitoring
```bash
# Monitor all logs in real-time
pm2 logs nexprepai-backend --lines 20
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🎉 Migration Complete!

Your NexPrep application is now fully configured for `https://nexprepai.com`. 

**Next Steps:**
1. Test all functionality thoroughly
2. Update any hardcoded URLs in documentation
3. Update DNS if needed
4. Monitor logs for any issues
5. Set up SSL certificate auto-renewal

**Support**: If issues persist, run `./diagnose-https-issues.sh` and review the output for specific problems.
