---

## 🔄 **Auto-Start Configuration**

### **Setup PM2 Auto-Start on EC2 Boot**

```bash
# 1. Generate PM2 startup script
pm2 startup

# 2. Run the command that pm2 startup outputs (will be something like):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

# 3. Save current PM2 processes
pm2 save

# 4. Verify auto-start is configured
sudo systemctl status pm2-ec2-user
```

### **Test Auto-Start**

```bash
# Test by rebooting (optional)
sudo reboot

# After reboot, check if backend is running
pm2 status
curl http://localhost:5000/
```

### **Manual Auto-Start Commands**

```bash
# Start PM2 service manually
sudo systemctl start pm2-ec2-user

# Stop PM2 service
sudo systemctl stop pm2-ec2-user

# Restart PM2 service
sudo systemctl restart pm2-ec2-user

# Check PM2 service status
sudo systemctl status pm2-ec2-user
```

---