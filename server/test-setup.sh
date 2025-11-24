#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "🧪 Aria2 + Master Server Test Script"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if aria2c is installed
echo "📦 Test 1: Checking aria2 installation..."
if command -v aria2c &> /dev/null; then
    VERSION=$(aria2c --version | head -n 1)
    echo -e "${GREEN}✓${NC} aria2 is installed: $VERSION"
else
    echo -e "${RED}✗${NC} aria2 is NOT installed!"
    echo "   Install with: sudo apt install aria2"
    exit 1
fi
echo ""

# Test 2: Check if aria2 RPC is running
echo "🔌 Test 2: Checking aria2 RPC connection..."
ARIA2_RESPONSE=$(curl -s http://localhost:6800/jsonrpc -d '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion"}' 2>&1)

if echo "$ARIA2_RESPONSE" | grep -q "version"; then
    echo -e "${GREEN}✓${NC} Aria2 RPC is running on port 6800"
    ARIA2_VERSION=$(echo "$ARIA2_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "   Version: $ARIA2_VERSION"
else
    echo -e "${RED}✗${NC} Aria2 RPC is NOT running!"
    echo "   Start with: aria2c --enable-rpc --rpc-listen-all=true"
    echo ""
    echo "   Quick start command:"
    echo "   aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all=true --dir=\$HOME/Downloads"
    exit 1
fi
echo ""

# Test 3: Check network connectivity
echo "🌐 Test 3: Checking network interfaces..."
IP_ADDRESSES=$(hostname -I 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
if [ -n "$IP_ADDRESSES" ]; then
    echo -e "${GREEN}✓${NC} Network interfaces found:"
    for IP in $IP_ADDRESSES; do
        echo "   - $IP"
    done
else
    echo -e "${YELLOW}⚠${NC} Could not detect network IP"
fi
echo ""

# Test 4: Check if ports are available
echo "🔓 Test 4: Checking port availability..."

# Check port 3000 (Master Server)
if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo -e "${YELLOW}⚠${NC} Port 3000 is already in use"
else
    echo -e "${GREEN}✓${NC} Port 3000 is available (Master Server)"
fi

# Check port 6800 (Aria2 RPC)
if netstat -tuln 2>/dev/null | grep -q ":6800 "; then
    echo -e "${GREEN}✓${NC} Port 6800 is in use (Aria2 RPC)"
else
    echo -e "${YELLOW}⚠${NC} Port 6800 is not in use (Aria2 RPC not running?)"
fi
echo ""

# Test 5: Check Node.js
echo "📦 Test 5: Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js is installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js is NOT installed!"
    exit 1
fi
echo ""

# Test 6: Test aria2 RPC methods
echo "🧪 Test 6: Testing aria2 RPC methods..."

# Get global stats
STATS=$(curl -s http://localhost:6800/jsonrpc -d '{"jsonrpc":"2.0","id":"stats","method":"aria2.getGlobalStat"}')
if echo "$STATS" | grep -q "numActive"; then
    echo -e "${GREEN}✓${NC} aria2.getGlobalStat works"
    
    NUM_ACTIVE=$(echo "$STATS" | grep -o '"numActive":"[^"]*"' | cut -d'"' -f4)
    DOWNLOAD_SPEED=$(echo "$STATS" | grep -o '"downloadSpeed":"[^"]*"' | cut -d'"' -f4)
    UPLOAD_SPEED=$(echo "$STATS" | grep -o '"uploadSpeed":"[^"]*"' | cut -d'"' -f4)
    
    echo "   Active downloads: $NUM_ACTIVE"
    echo "   Download speed: $DOWNLOAD_SPEED bytes/s"
    echo "   Upload speed: $UPLOAD_SPEED bytes/s"
else
    echo -e "${RED}✗${NC} aria2.getGlobalStat failed"
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✓${NC} Aria2 is ready for use!"
echo ""
echo "Next steps:"
echo "1. cd server"
echo "2. npm install (if not done)"
echo "3. npm start"
echo ""
echo "Aria2 RPC URL: http://localhost:6800/jsonrpc"
echo "Master Server will run on: http://localhost:3000"
echo "═══════════════════════════════════════════════════════"
