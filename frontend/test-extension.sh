#!/bin/bash

# Test script for Chrome Extension WASM loading
# This script provides helpful commands for testing the extension

set -e

echo "🧪 Chrome Extension WASM Test Helper"
echo "===================================="
echo ""

# Check if extension directory exists
if [ ! -d "extension" ]; then
    echo "❌ Error: extension directory not found"
    echo "   Run this script from the frontend directory"
    exit 1
fi

# Check if WASM files exist
if [ ! -f "extension/wasm/chromium_history_wasm_bg.wasm" ]; then
    echo "❌ Error: WASM file not found"
    echo "   Run 'make build-rust' first"
    exit 1
fi

echo "✅ WASM file found:"
ls -lh extension/wasm/chromium_history_wasm_bg.wasm

echo ""
echo "📋 Next steps to test the extension:"
echo ""
echo "1. Open Chrome and go to: chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top-right)"
echo "3. Click 'Load unpacked' and select:"
echo "   $(pwd)/extension"
echo ""
echo "4. Open the extension popup and check the console:"
echo "   - Right-click the extension icon"
echo "   - Select 'Inspect popup'"
echo "   - Check Console tab for WASM initialization logs"
echo ""
echo "5. Check the service worker console:"
echo "   - In chrome://extensions/, find your extension"
echo "   - Click 'service worker' link"
echo "   - Check for '[initializeWasm]' log messages"
echo ""
echo "6. Test WASM loading:"
echo "   - Click the extension icon"
echo "   - Try querying your history"
echo "   - Check for 'WASM module initialized successfully' message"
echo ""
echo "🔍 Debugging tips:"
echo ""
echo "If WASM still fails to load:"
echo ""
echo "A. Check Content Security Policy:"
echo "   - Ensure manifest.json has 'wasm-unsafe-eval' in CSP"
echo "   - Current CSP: $(grep -A 1 'content_security_policy' extension/manifest.json)"
echo ""
echo "B. Check WASM file integrity:"
echo "   - Run: file extension/wasm/chromium_history_wasm_bg.wasm"
echo "   - Should show: 'WebAssembly (wasm) binary module'"
echo ""
echo "C. Test WASM outside extension:"
echo "   - Serve test-wasm.html with a local server"
echo "   - Example: python3 -m http.server 8000"
echo "   - Open: http://localhost:8000/test-wasm.html"
echo ""
echo "D. Check service worker logs:"
echo "   - Look for fetch() errors"
echo "   - Look for WebAssembly compilation errors"
echo "   - Check for memory issues"
echo ""
echo "📝 Common issues and solutions:"
echo ""
echo "1. 'Failed to fetch WASM' → Check file permissions"
echo "2. 'WebAssembly.instantiate failed' → Check WASM file corruption"
echo "3. 'Memory access out of bounds' → WASM memory configuration issue"
echo "4. Import errors → Check ES module syntax in service worker"
echo ""
echo "🛠️  Quick rebuild:"
echo "   make build-rust"
echo ""
echo "Good luck! 🚀"

