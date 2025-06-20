# 🚀 NexPrep EC2 Deployment Guide

## 📋 Complete Step-by-Step Deployment Commands

This guide contains all commands needed to deploy NexPrep updates to EC2 server.

---

## 🔐 **Prerequisites**

- SSH access to EC2 server: `ssh -i your-key.pem ec2-user@43.205.88.43`
- Git repository with latest changes pushed to GitHub
- PM2 and Node.js installed on server

---

## 📦 **Quick Deployment (Most Common)**

### **For Code Changes Only (No New Packages)**

```bash
# 1. Navigate to project directory
cd /var/www/NexPrep

# 2. Check current status
pwd
git status
git log --oneline -3

# 3. Pull latest changes
git pull origin main

# 4. Check what files changed
git diff HEAD~1 --name-only

# 5. Build Frontend (if frontend changes)
cd frontend
npm run build

# 6. Deploy Frontend
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html/
sudo restorecon -R /usr/share/nginx/html/

# 7. Build Admin Panel (if admin changes)
cd ../admin-panel
npm run build -- --configuration production

# 8. Deploy Admin Panel
sudo cp -r dist/admin-panel/browser/* /usr/share/nginx/html/admin/browser/
sudo chown -R nginx:nginx /usr/share/nginx/html/admin/
sudo restorecon -R /usr/share/nginx/html/admin/

# 9. Restart Backend (if backend changes)
pm2 restart nexprepai-backend

# 10. Verify deployment
curl -I http://43.205.88.43/
curl -I http://43.205.88.43/admin/
pm2 status
```

---

## 🔧 **Environment Files Fix (If Build Fails)**

### **If you get "Cannot find module '../environments/environment'" error:**

```bash
cd /var/www/NexPrep/frontend

# Check existing environment files
ls -la src/environments/

# Create development environment file
cat > src/environments/environment.ts << 'EOF'
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  socketUrl: 'http://localhost:5000',
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

# Create/fix production environment file
cat > src/environments/environment.prod.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api',
  socketUrl: 'http://43.205.88.43',
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

# Verify files created
ls -la src/environments/
cat src/environments/environment.ts

# Now try building again
npm run build
```

---

## 📦 **Full Deployment (With New Dependencies)**

### **If package.json changed or fresh deployment needed:**

```bash
# 1. Navigate to project
cd /var/www/NexPrep

# 2. Pull latest changes
git pull origin main

# 3. Install backend dependencies
cd backend
npm install

# 4. Install admin panel dependencies
cd ../admin-panel
npm install --legacy-peer-deps

# 5. Install frontend dependencies
cd ../frontend
npm install --legacy-peer-deps

# 6. Build and deploy frontend
npm run build
sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/
sudo chown -R nginx:nginx /usr/share/nginx/html/
sudo restorecon -R /usr/share/nginx/html/

# 7. Build and deploy admin panel
cd ../admin-panel
npm run build -- --configuration production
sudo cp -r dist/admin-panel/browser/* /usr/share/nginx/html/admin/browser/
sudo chown -R nginx:nginx /usr/share/nginx/html/admin/
sudo restorecon -R /usr/share/nginx/html/admin/

# 8. Restart backend
cd ..
pm2 restart nexprepai-backend

# 9. Verify
pm2 status
pm2 logs nexprepai-backend --lines 10
curl -I http://43.205.88.43/
curl -I http://43.205.88.43/admin/
```

---

## 🔄 **PM2 Management Commands**

```bash
# Check status
pm2 status
pm2 list

# View logs
pm2 logs nexprepai-backend
pm2 logs nexprepai-backend --lines 20
pm2 logs nexprepai-backend --err

# Restart/Stop/Start
pm2 restart nexprepai-backend
pm2 stop nexprepai-backend
pm2 start ecosystem.config.js --env production

# Clear logs
pm2 flush nexprepai-backend

# Monitor
pm2 monit

# Save current state
pm2 save
```

---

## 🩺 **Troubleshooting Commands**

### **Check Application Health**

```bash
# Test local backend
curl http://localhost:5000/
curl http://localhost:5000/api/hierarchy

# Test public endpoints
curl -I http://43.205.88.43/
curl -I http://43.205.88.43/admin/
curl -I http://43.205.88.43/api/hierarchy

# Check nginx status
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx

# Check file permissions
ls -la /usr/share/nginx/html/
ls -la /usr/share/nginx/html/admin/browser/

# Check nginx logs
sudo tail -20 /var/log/nginx/error.log
sudo tail -20 /var/log/nginx/access.log
```

### **Fix Common Issues**

```bash
# Fix file permissions
sudo chown -R nginx:nginx /usr/share/nginx/html/
sudo chmod -R 755 /usr/share/nginx/html/
sudo restorecon -R /usr/share/nginx/html/

# Fix SELinux (if needed)
sudo setsebool -P httpd_can_network_connect 1
sudo restorecon -R /usr/share/nginx/html/

# Fix Firebase permissions
sudo chown ec2-user:ec2-user backend/config/nexprepauth-firebase-adminsdk-fbsvc-4b2f8377b1.json
```

---

## 🌐 **Access URLs**

- **Main Website**: http://43.205.88.43/
- **Admin Panel**: http://43.205.88.43/admin/
- **API Documentation**: http://43.205.88.43/api-docs/
- **API Health Check**: http://43.205.88.43/api/

---

## 📁 **Important Paths**

- **Project Root**: `/var/www/NexPrep/`
- **Frontend Build**: `/var/www/NexPrep/frontend/dist/frontend/browser/`
- **Admin Build**: `/var/www/NexPrep/admin-panel/dist/admin-panel/browser/`
- **Nginx HTML**: `/usr/share/nginx/html/`
- **Nginx Admin**: `/usr/share/nginx/html/admin/browser/`
- **Nginx Config**: `/etc/nginx/conf.d/nexprepai.conf`
- **Backend Config**: `/var/www/NexPrep/backend/.env.prod`

---

## ⚡ **One-Liner Quick Deploy**

### **For Frontend Only Changes:**
```bash
cd /var/www/NexPrep && git pull origin main && cd frontend && npm run build && sudo cp -r dist/frontend/browser/* /usr/share/nginx/html/ && sudo chown -R nginx:nginx /usr/share/nginx/html/ && sudo restorecon -R /usr/share/nginx/html/ && curl -I http://43.205.88.43/
```

### **For Admin Panel Only Changes:**
```bash
cd /var/www/NexPrep && git pull origin main && cd admin-panel && npm run build -- --configuration production && sudo cp -r dist/admin-panel/browser/* /usr/share/nginx/html/admin/browser/ && sudo chown -R nginx:nginx /usr/share/nginx/html/admin/ && sudo restorecon -R /usr/share/nginx/html/admin/ && curl -I http://43.205.88.43/admin/
```

### **For Backend Only Changes:**
```bash
cd /var/www/NexPrep && git pull origin main && cd backend && npm install && pm2 restart nexprepai-backend && pm2 status
```

---

## 📝 **Deployment Checklist**

- [ ] SSH into EC2 server
- [ ] Navigate to `/var/www/NexPrep`
- [ ] Pull latest changes from GitHub
- [ ] Check which files changed
- [ ] Install dependencies (if package.json changed)
- [ ] Build frontend (if frontend changed)
- [ ] Build admin panel (if admin changed)
- [ ] Deploy built files to nginx directories
- [ ] Restart backend (if backend changed)
- [ ] Set correct file permissions
- [ ] Test all endpoints
- [ ] Verify PM2 status
- [ ] Check logs for errors

---

## 🎯 **Success Indicators**

✅ **PM2 Status**: `nexprepai-backend` shows "online"  
✅ **Main Site**: `curl -I http://43.205.88.43/` returns 200 OK  
✅ **Admin Panel**: `curl -I http://43.205.88.43/admin/` returns 200 OK  
✅ **API**: Backend logs show no errors  
✅ **Nginx**: Service running without errors  

---

**🚀 Deployment Complete!** Your NexPrep website is now updated and live.
