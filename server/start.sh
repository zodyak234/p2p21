#!/bin/bash

# Quick Start Script for Aria2 + Master Server
# This script starts both aria2 and the master server

echo "═══════════════════════════════════════════════════════"
echo "🚀 Starting Aria2 + Master Server"
echo "═══════════════════════════════════════════════════════"
echo ""

# Configuration
ARIA2_DIR="$HOME/Downloads"  # Change this to your preferred download directory
ARIA2_PORT=6800
SERVER_PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if aria2c is installed
echo -e "${YELLOW}📦 Checking aria2 installation...${NC}"
if command -v aria2c &> /dev/null; then
    echo -e "${GREEN}✓ aria2 found${NC}"
else
    echo -e "${RED}✗ aria2 not found! Please install it first.${NC}"
    echo "   Ubuntu/Debian: sudo apt install aria2"
    echo "   macOS: brew install aria2"
    exit 1
fi
echo ""

# Check if aria2 is already running
echo -e "${YELLOW}🔍 Checking if aria2 is already running...${NC}"
if pgrep -x "aria2c" > /dev/null; then
    echo -e "${YELLOW}⚠ aria2 is already running${NC}"
    read -p "Do you want to restart it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing aria2 process..."
        pkill -9 aria2c
        sleep 2
    else
        echo -e "${GREEN}Using existing aria2 instance${NC}"
        SKIP_ARIA2=true
    fi
fi
echo ""

# Start aria2 if not skipped
if [ -z "$SKIP_ARIA2" ]; then
    echo -e "${YELLOW}🚀 Starting aria2 RPC server...${NC}"
    echo "   Port: $ARIA2_PORT"
    echo "   Download directory: $ARIA2_DIR"
    
    # Create download directory if it doesn't exist
    mkdir -p "$ARIA2_DIR"
    
    # Start aria2 in background
    aria2c \
        --enable-rpc \
        --rpc-listen-all=true \
        --rpc-allow-origin-all=true \
        --rpc-listen-port=$ARIA2_PORT \
        --dir="$ARIA2_DIR" \
        --max-connection-per-server=16 \
        --split=16 \
        --max-concurrent-downloads=10 \
        --continue=true \
        --max-overall-upload-limit=100M \
        --disk-cache=64M \
        --daemon=true \
        --log=/tmp/aria2.log \
        --log-level=notice
    
    echo -e "${GREEN}✓ aria2 started${NC}"
    sleep 2
    
    # Test aria2 connection
    RESPONSE=$(curl -s http://localhost:$ARIA2_PORT/jsonrpc -d '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion"}')
    if echo "$RESPONSE" | grep -q "version"; then
        VERSION=$(echo "$RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✓ aria2 RPC is responding (v$VERSION)${NC}"
    else
        echo -e "${RED}✗ Failed to connect to aria2 RPC${NC}"
        exit 1
    fi
fi
echo ""

# Start Master Server
echo -e "${YELLOW}🚀 Starting Master Server...${NC}"
echo "   Port: $SERVER_PORT"
echo ""

# Check if we're in the server directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠ Not in server directory. Changing to server directory...${NC}"
    if [ -d "server" ]; then
        cd server
    else
        echo -e "${RED}✗ Cannot find server directory!${NC}"
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Starting services...${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}Aria2 RPC:     http://localhost:$ARIA2_PORT/jsonrpc${NC}"
echo -e "${CYAN}Master Server: http://localhost:$SERVER_PORT${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping services..."
    pkill -9 aria2c 2>/dev/null
    echo "Done!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start the server
npm start
