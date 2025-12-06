#!/bin/bash

set -e

echo "========================================="
echo "Compiling Chromium History Extension"
echo "========================================="

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDS_DIR="$PROJECT_ROOT/../../chromium-history-extension-builds"

# Extract version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' "$PROJECT_ROOT/extension/manifest.json" | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
    VERSION="unknown"
    echo "Warning: Could not extract version from manifest.json, using 'unknown'"
fi

echo ""
echo "Version: $VERSION"
echo ""

# Step 1: Build the extension
echo "Step 1: Building extension..."
if command -v make &> /dev/null; then
    make build
else
    echo "Make not found, running build.sh..."
    bash "$PROJECT_ROOT/build.sh"
fi

# Step 2: Create builds directory if it doesn't exist
echo ""
echo "Step 2: Preparing builds directory..."
mkdir -p "$BUILDS_DIR"
echo "✓ Builds directory ready: $BUILDS_DIR"

# Step 3: Create ZIP file
echo ""
echo "Step 3: Creating ZIP package..."
ZIP_NAME="chromium-history-extension-v${VERSION}.zip"
ZIP_PATH="$BUILDS_DIR/$ZIP_NAME"

# Remove old ZIP if it exists
if [ -f "$ZIP_PATH" ]; then
    echo "Removing existing ZIP: $ZIP_NAME"
    rm "$ZIP_PATH"
fi

# Create ZIP from extension directory contents
cd "$PROJECT_ROOT/extension"
zip -r "$ZIP_PATH" . \
    -x "*.DS_Store" \
    -x "README.md" \
    -x ".git/*" \
    -x ".gitignore" \
    > /dev/null
cd "$PROJECT_ROOT"

# Verify ZIP was created
if [ -f "$ZIP_PATH" ]; then
    ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
    echo "✓ ZIP package created successfully!"
    echo ""
    echo "========================================="
    echo "Package ready for Chrome Web Store!"
    echo "========================================="
    echo ""
    echo "File: $ZIP_PATH"
    echo "Size: $ZIP_SIZE"
    echo ""
    echo "You can now upload this ZIP file to the Chrome Web Store."
else
    echo "✗ Error: Failed to create ZIP file"
    exit 1
fi

