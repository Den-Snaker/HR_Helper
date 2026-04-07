#!/bin/bash

# HR Helper VPS Setup Script
# Run as root on fresh Ubuntu 22.04/24.04 server

set -e

SERVER_IP="83.166.245.83"
DOMAIN="hr.ctpco.ru"
APP_DIR="/var/www/hr-helper"

echo "=== HR Helper VPS Setup ==="
echo "Server IP: $SERVER_IP"
echo "Domain: $DOMAIN"
echo ""

# Update system
echo "[1/8] Updating system..."
apt update && apt upgrade -y

# Install Node.js 20
echo "[2/8] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node --version
npm --version

# Install PM2
echo "[3/8] Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# Install Nginx
echo "[4/8] Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
echo "[5/8] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Configure firewall
echo "[6/8] Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Create app directory
echo "[7/8] Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository if not exists
if [ ! -f "package.json" ]; then
    echo "Cloning repository..."
    git clone https://github.com/Den-Snaker/HR_Helper.git .
fi

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Create .env file for production
echo "[8/8] Creating environment file..."
cat > .env << 'EOF'
HH_CLIENT_ID=HM6IQ1ID72NVQLBSA421O3L75FAKQN
HH_CLIENT_SECRET=GG4MR4A5BEL6CN093NN94EIF8VQKLQQ7MTGA001O
REDIRECT_URI=https://hr.ctpco.ru/auth/callback
PORT=5001
SESSION_SECRET=hr-helper-production-secret-key-2024-secure
EOF

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/hr.ctpco.ru << 'NGINX_CONF'
server {
    listen 80;
    server_name hr.ctpco.ru;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX_CONF

# Enable site
ln -sf /etc/nginx/sites-available/hr.ctpco.ru /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Start application with PM2
echo "Starting application..."
cd $APP_DIR
pm2 delete hr-helper 2>/dev/null || true
pm2 start src/server.js --name hr-helper
pm2 save

# Get SSL certificate
echo ""
echo "=== SSL Certificate Setup ==="
echo "Run this command to get SSL certificate:"
echo "certbot --nginx -d hr.ctpco.ru"
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Application URL: https://hr.ctpco.ru"
echo "Local URL: http://localhost:5001"
echo ""
echo "Useful commands:"
echo "  pm2 logs hr-helper    # View logs"
echo "  pm2 restart hr-helper # Restart app"
echo "  pm2 status            # Check status"