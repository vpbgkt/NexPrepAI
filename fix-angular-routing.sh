#!/bin/bash

# NexPrep Angular Routing Fix Script
# Run this on your EC2 server to fix Angular routing issues

echo "🔧 NexPrep Angular Routing Fix Script"
echo "=================================="

# Check current user
echo "Current user: $(whoami)"

# 1. Check Nginx status
echo "📊 Step 1: Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

# 2. Find correct Nginx document root
echo ""
echo "📂 Step 2: Finding Nginx document root..."
NGINX_ROOT=$(sudo grep -r "root " /etc/nginx/ 2>/dev/null | grep -v "#" | head -1 | awk '{print $3}' | tr -d ';')
echo "Nginx document root: $NGINX_ROOT"

# 3. Check current Nginx configuration
echo ""
echo "⚙️ Step 3: Checking Nginx configuration..."
echo "Looking for try_files directive..."
sudo grep -r "try_files" /etc/nginx/ 2>/dev/null || echo "❌ try_files directive not found!"

# 4. Test Nginx configuration
echo ""
echo "🧪 Step 4: Testing Nginx configuration..."
sudo nginx -t

# 5. Check if frontend files exist
echo ""
echo "📁 Step 5: Checking frontend files..."
if [ -d "/usr/share/nginx/html" ]; then
    echo "Files in /usr/share/nginx/html:"
    ls -la /usr/share/nginx/html/
elif [ -d "/var/www/html" ]; then
    echo "Files in /var/www/html:"
    ls -la /var/www/html/
else
    echo "❌ No standard Nginx document root found!"
fi

# 6. Check if project exists
echo ""
echo "📦 Step 6: Checking project directory..."
if [ -d "/var/www/NexPrep" ]; then
    echo "✅ Project directory found at /var/www/NexPrep"
    cd /var/www/NexPrep
    echo "Current git branch: $(git branch --show-current)"
    echo "Last commit: $(git log --oneline -1)"
else
    echo "❌ Project directory not found at /var/www/NexPrep"
fi

# 7. Quick fix function
fix_angular_routing() {
    echo ""
    echo "🚀 Applying Angular routing fix..."
    
    # Navigate to project
    cd /var/www/NexPrep
    
    # Pull latest changes
    echo "Pulling latest changes..."
    git pull origin main
    
    # Build frontend
    echo "Building frontend..."
    cd frontend
    npm run build -- --configuration production
    
    # Determine correct Nginx root
    if [ -d "/usr/share/nginx/html" ]; then
        NGINX_ROOT="/usr/share/nginx/html"
    elif [ -d "/var/www/html" ]; then
        NGINX_ROOT="/var/www/html"
    else
        echo "❌ Cannot determine Nginx root directory"
        return 1
    fi
    
    # Deploy files
    echo "Deploying to $NGINX_ROOT..."
    sudo rm -rf $NGINX_ROOT/*
    sudo cp -r dist/frontend/browser/* $NGINX_ROOT/
    sudo chown -R nginx:nginx $NGINX_ROOT/
    sudo chmod -R 755 $NGINX_ROOT/
    
    # Update Nginx config with correct try_files
    echo "Updating Nginx configuration..."
    sudo cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Create proper Nginx config
    sudo tee /etc/nginx/conf.d/default.conf > /dev/null << EOF
server {
    listen 80;
    server_name 43.205.88.43;
    
    # Serve frontend static files
    location / {
        root $NGINX_ROOT;
        index index.html index.htm;
        # CRITICAL: Handle Angular routing
        try_files \$uri \$uri/ /index.html;
        
        # Don't cache index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
    
    # Socket.IO proxy
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 86400;
    }
}
EOF
    
    # Test and reload Nginx
    echo "Testing Nginx configuration..."
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        echo "Reloading Nginx..."
        sudo systemctl reload nginx
        echo "✅ Fix applied successfully!"
    else
        echo "❌ Nginx configuration test failed"
        return 1
    fi
}

# 8. Test current routing
test_routing() {
    echo ""
    echo "🧪 Testing current routing..."
    
    echo "Testing home page..."
    curl -s -o /dev/null -w "%{http_code}" http://43.205.88.43/ && echo " ✅" || echo " ❌"
    
    echo "Testing public profile route..."
    curl -s -o /dev/null -w "%{http_code}" http://43.205.88.43/user/vpbgkt && echo " ✅" || echo " ❌"
    
    echo "Testing leaderboard route..."
    curl -s -o /dev/null -w "%{http_code}" http://43.205.88.43/leaderboard/test && echo " ✅" || echo " ❌"
    
    echo "Testing API..."
    curl -s -o /dev/null -w "%{http_code}" http://43.205.88.43/api/health && echo " ✅" || echo " ❌"
}

# Main menu
echo ""
echo "What would you like to do?"
echo "1. Run diagnostic only"
echo "2. Apply fix automatically"
echo "3. Test routing"
echo "4. All of the above"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "Running diagnostic only..."
        ;;
    2)
        fix_angular_routing
        ;;
    3)
        test_routing
        ;;
    4)
        fix_angular_routing
        test_routing
        ;;
    *)
        echo "Invalid choice"
        ;;
esac

echo ""
echo "🏁 Script completed!"
echo ""
echo "If issues persist, check:"
echo "1. Browser console for JavaScript errors"
echo "2. Nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "3. Make sure backend is running: pm2 status"
