#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. sudo ./uninstall.sh)"
  exit 1
fi

echo "Stopping emby-rpc service..."
systemctl stop emby-rpc

echo "Disabling emby-rpc service..."
systemctl disable emby-rpc

echo "Removing systemd service file..."
rm -f /etc/systemd/system/emby-rpc.service

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Uninstallation complete! The background service has been removed."
