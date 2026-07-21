#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ENV_FILE="$DIR/.env"

ask() {
    local key=$1
    local prompt=$2
    local current_val=""

    if [ -f "$ENV_FILE" ]; then
        current_val=$(grep -E "^${key}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '\r')
    fi

    if [ -n "$current_val" ]; then
        clear > /dev/tty 2>/dev/null || true
        read -r -p "$prompt (Leave empty to keep current): " answer
    else
        clear > /dev/tty 2>/dev/null || true
        read -r -p "$prompt: " answer
    fi

    if [ -z "$answer" ] && [ -n "$current_val" ]; then
        echo "$current_val"
    else
        echo "$answer"
    fi
}

USER_TOKEN=$(ask "USER_TOKEN" "Discord User Token")
EMBY_SERVER_URL=$(ask "EMBY_SERVER_URL" "Emby Server URL (e.g. http://localhost:8096)")
EMBY_API_KEY=$(ask "EMBY_API_KEY" "Emby API Key")
APPLICATION_ID=$(ask "APPLICATION_ID" "Discord Application ID")
PORT=$(ask "PORT" "Webhook Listener Port (Default: 8068)")

if [ -z "$PORT" ]; then
    PORT="8068"
fi

cat > "$ENV_FILE" << EOF
USER_TOKEN=$USER_TOKEN
EMBY_SERVER_URL=$EMBY_SERVER_URL
EMBY_API_KEY=$EMBY_API_KEY
APPLICATION_ID=$APPLICATION_ID
PORT=$PORT
EOF

clear
echo "Configuration successfully saved to .env!"
echo "If the background service is currently running, restart it to apply changes:"
echo "  sudo systemctl restart emby-rpc"
echo ""
