# Angular Routing Issues on Production Server - Troubleshooting Guide

## 🔍 **Problem Diagnosis**

The issue you're experiencing is a common problem with Angular Single Page Applications (SPAs) deployed on production servers. Here's what's happening:

### **Root Cause**
- **Local Development**: Angular CLI dev server (`ng serve`) automatically handles all routes and serves `index.html` for any unrecognized path
- **Production Server**: When you visit `http://43.205.88.43/user/vpbgkt`, the server looks for a physical file/folder at that path, doesn't find it, and falls back to the default behavior

## 🛠️ **Solutions**

### **Solution 1: Verify Nginx Configuration (Most Likely Fix)**

Your current Nginx config looks correct, but let's ensure it's properly applied:

```bash
# 1. SSH to your server
ssh -i your-key.pem ec2-user@43.205.88.43

# 2. Check current Nginx config
sudo cat /etc/nginx/conf.d/default.conf
# OR
sudo cat /etc/nginx/sites-available/default

# 3. Verify the try_files directive exists
sudo grep -r "try_files" /etc/nginx/

# 4. Test Nginx configuration
sudo nginx -t

# 5. Reload Nginx if needed
sudo systemctl reload nginx

# 6. Check Nginx status
sudo systemctl status nginx
```

### **Solution 2: Update Nginx Configuration**

If the configuration is missing or incorrect, update it:

```nginx
# /etc/nginx/conf.d/default.conf or your Nginx config file
server {
    listen 80;
    server_name 43.205.88.43;
    
    # Serve frontend static files
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # CRITICAL: This line handles Angular routing
        try_files $uri $uri/ /index.html;
        
        # Optional: Add headers for better caching
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
    
    # Socket.IO proxy
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 86400;
    }
}
```

### **Solution 3: Verify Frontend Build and Deployment**

Ensure the frontend is built correctly for production:

```bash
# On your local machine or server
cd /var/www/NexPrep/frontend

# Build for production with proper base href
npm run build -- --configuration production --base-href /

# Verify build files
ls -la dist/frontend/browser/

# Check if index.html exists and has correct base href
cat dist/frontend/browser/index.html | grep "base href"

# Deploy to Nginx directory
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html/

# Verify files are deployed
ls -la /usr/share/nginx/html/
```

### **Solution 4: Debug Angular Router**

Add debugging to your Angular app to see what's happening:

```typescript
// In your app.component.ts or main.ts, add:
import { Router, NavigationEnd } from '@angular/router';

constructor(private router: Router) {
  this.router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      console.log('Navigation to:', event.url);
    }
  });
}
```

### **Solution 5: Check for Route Guard Issues**

The issue might be with route guards redirecting users:

```typescript
// Check your guards: student.guard.ts, enrollment.guard.ts, etc.
// Make sure they're not redirecting public routes

// For public routes like /user/:username, ensure no guards are applied
{ path: 'user/:username', component: PublicProfileComponent }, // No guards
{ path: 'leaderboard/:seriesId', component: LeaderboardComponent }, // No guards
```

## 🧪 **Testing Steps**

### **Step 1: Test Nginx Configuration**
```bash
# Direct test of try_files
curl -I http://43.205.88.43/user/vpbgkt
# Should return 200 OK, not 404

# Test if index.html is served for unknown routes
curl http://43.205.88.43/nonexistent-route
# Should return the contents of index.html
```

### **Step 2: Test Frontend Files**
```bash
# Check if main files exist
curl http://43.205.88.43/main.js
curl http://43.205.88.43/index.html

# Check if Angular app loads
curl http://43.205.88.43/ | grep "app-root"
```

### **Step 3: Browser Developer Tools**
1. Open browser console on `http://43.205.88.43/user/vpbgkt`
2. Check **Network** tab for any failed requests
3. Check **Console** tab for JavaScript errors
4. Look for Angular router logs

## 🚀 **Complete Fix Commands**

Run these commands on your server to fix the issue:

```bash
# 1. SSH to server
ssh -i your-key.pem ec2-user@43.205.88.43

# 2. Navigate to project
cd /var/www/NexPrep

# 3. Pull latest code
git pull origin main

# 4. Build frontend properly
cd frontend
npm run build -- --configuration production

# 5. Deploy with correct permissions
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html/

# 6. Update Nginx config (backup first)
sudo cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup

# 7. Edit Nginx config to ensure try_files is present
sudo nano /etc/nginx/conf.d/default.conf

# 8. Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# 9. Test the fix
curl -I http://43.205.88.43/user/vpbgkt
```

## 🔍 **Common Issues and Fixes**

### **Issue 1: Wrong Nginx Document Root**
```bash
# Check current document root
sudo grep -r "root" /etc/nginx/conf.d/
# Should be: root /usr/share/nginx/html;
```

### **Issue 2: Missing try_files Directive**
```bash
# Check if try_files exists
sudo grep -r "try_files" /etc/nginx/conf.d/
# Should contain: try_files $uri $uri/ /index.html;
```

### **Issue 3: Permission Issues**
```bash
# Fix permissions
sudo chown -R nginx:nginx /usr/share/nginx/html/
sudo chmod -R 755 /usr/share/nginx/html/
```

### **Issue 4: Cached Old Files**
```bash
# Clear browser cache and test in incognito mode
# Or add cache-busting headers to Nginx config
```

## 📊 **Verification**

After implementing the fix, verify these work:
- ✅ `http://43.205.88.43/` (home page)
- ✅ `http://43.205.88.43/user/vpbgkt` (public profile)
- ✅ `http://43.205.88.43/leaderboard/someId` (leaderboard)
- ✅ Browser back/forward buttons work
- ✅ Direct URL access works
- ✅ Page refresh works on any route

The most likely solution is ensuring the Nginx `try_files` directive is properly configured and the frontend files are correctly deployed.
