# 🚀 Final Deployment Commands

## Quick Command Reference for Production Deployment

### 1. Push All Changes (Run Locally)
```bash
# Commit and push all migration changes
git add .
git commit -m "Complete HTTPS migration: Remove all old IP references, fix CORS and login redirect"
git push origin main
```

### 2. Deploy on Production Server
```bash
# SSH into production server
ssh -i your-key.pem ec2-user@43.205.88.43

# Navigate to project directory
cd /var/www/NexPrep

# Pull latest changes
git pull origin main

# Run enhanced deployment script
chmod +x deploynp-enhanced.sh
./deploynp-enhanced.sh
```

### 3. Quick Manual Verification (if needed)
```bash
# Verify backend environment on server
cat backend/.env.prod | grep ALLOWED_ORIGIN
# Should show: ALLOWED_ORIGIN=https://nexprepai.com,http://localhost:4200

# Test key endpoints
curl -I https://nexprepai.com/
curl -I https://nexprepai.com/api/
curl -I https://nexprepai.com/admin/
curl https://nexprepai.com/user/vpbgkt | grep app-root
```

## 🎯 Expected Results After Deployment

### All These Should Return ✅:
- ✅ Main site loads at `https://nexprepai.com/`
- ✅ Angular routes work: `https://nexprepai.com/user/vpbgkt`
- ✅ Admin panel loads: `https://nexprepai.com/admin/`
- ✅ API responds: `https://nexprepai.com/api/`
- ✅ Chat shows "Connected" (not "Connection lost")
- ✅ No CORS errors in browser console
- ✅ No 502 Bad Gateway errors
- ✅ Login redirects work properly

### If Any Issues:
1. Check deployment script output for detailed diagnostics
2. Review browser console for client-side errors  
3. Check PM2 logs: `pm2 logs nexprepai-backend`
4. Verify Nginx: `sudo nginx -t && sudo systemctl status nginx`

## 📝 Notes
- The deployment script includes comprehensive testing and diagnostics
- All old IP references have been removed from runtime code
- Documentation still contains old IP but doesn't affect production
- Login component now properly redirects authenticated users
- CORS is configured for the new domain only
