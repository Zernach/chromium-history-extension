#!/bin/bash

set -e

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the sync-version script to get sync_version function
if [ -f "$PROJECT_ROOT/sync-version.sh" ]; then
    source "$PROJECT_ROOT/sync-version.sh"
else
    echo "Warning: sync-version.sh not found, skipping version sync"
    sync_version() {
        echo "Skipping version sync (sync-version.sh not available)"
    }
fi

echo "========================================="
echo "Building Chromium History Extension"
echo "========================================="

# Sync version from manifest.json to all files before building
echo ""
echo "Step 0: Syncing version across all files..."
sync_version
echo ""

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Error: wasm-pack is not installed"
    echo "Install with: cargo install wasm-pack"
    exit 1
fi

# Build Rust/WASM module
echo ""
echo "Step 1: Building Rust/WASM module..."
cd rust
wasm-pack build --target web --out-dir ../extension/wasm --no-typescript
cd ..
echo "✓ Rust/WASM build complete!"

# Note about Dart
echo ""
echo "Step 2: Dart compilation..."
echo "Note: Dart to JS compilation for Chrome extensions is complex."
echo "Consider using TypeScript instead, or use dart2js with proper setup."
echo "For now, the extension will need JavaScript implementations."

# Check if extension directory is ready
echo ""
echo "Step 3: Verifying extension structure..."
if [ -d "extension" ]; then
    echo "✓ Extension directory exists"
else
    echo "✗ Extension directory missing"
    exit 1
fi

echo ""
echo "========================================="
echo "Build complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Implement JavaScript files in extension/lib/ (or use Dart compilation)"
echo "2. Create extension icons in extension/assets/"
echo "3. Load extension in Chrome:"
echo "   - Open chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'extension' directory"
echo ""
