#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. sudo ./install.sh)"
  exit 1
fi

echo "Installing dependencies..."
npm install

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
USER_NAME=${SUDO_USER:-$USER}

echo "Creating systemd service..."

cat > /etc/systemd/system/emby-rpc.service << EOF
[Unit]
Description=Emby to Discord Rich Presence Bridge
After=network.target

[Service]
ExecStart=/usr/bin/node $DIR/src/index.js
WorkingDirectory=$DIR
Restart=always
User=$USER_NAME
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Enabling and starting emby-rpc service..."
systemctl enable emby-rpc
systemctl start emby-rpc

echo ""
echo "Launching configuration wizard..."
sudo -u $USER_NAME bash "$DIR/setup.sh"

echo ""
echo "Installation Complete!"
echo "The background service is now running."
