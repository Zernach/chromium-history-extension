#!/bin/bash

# Version synchronization utility
# Syncs version from manifest.json (source of truth) to all other files

set -e

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_ROOT="$PROJECT_ROOT"

# Function to sync version from manifest.json to all other files
# Usage: sync_version [version]
# If version is not provided, reads from manifest.json
sync_version() {
    local MANIFEST_FILE="$FRONTEND_ROOT/extension/manifest.json"
    
    # Get version (either from argument or from manifest)
    local VERSION="${1:-}"
    if [ -z "$VERSION" ]; then
        VERSION=$(grep -o '"version": "[^"]*"' "$MANIFEST_FILE" | cut -d'"' -f4)
        if [ -z "$VERSION" ]; then
            echo "Error: Could not extract version from manifest.json"
            exit 1
        fi
    fi
    
    echo "Syncing version: $VERSION"
    
    # Determine sed command based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SED_INPLACE="sed -i ''"
    else
        SED_INPLACE="sed -i"
    fi
    
    # Update pubspec.yaml
    local PUBSPEC_FILE="$FRONTEND_ROOT/dart/pubspec.yaml"
    if [ -f "$PUBSPEC_FILE" ]; then
        $SED_INPLACE "s/^version: [0-9.]*/version: $VERSION/" "$PUBSPEC_FILE"
        echo "  ✓ Updated pubspec.yaml"
    fi
    
    # Update Cargo.toml
    local CARGO_FILE="$FRONTEND_ROOT/rust/Cargo.toml"
    if [ -f "$CARGO_FILE" ]; then
        $SED_INPLACE "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" "$CARGO_FILE"
        echo "  ✓ Updated Cargo.toml"
    fi
    
    # Update PROJECT_STATUS.md
    local STATUS_FILE="$FRONTEND_ROOT/PROJECT_STATUS.md"
    if [ -f "$STATUS_FILE" ]; then
        $SED_INPLACE "s/^\*\*Version:\*\* [0-9.]*/**Version:** $VERSION/" "$STATUS_FILE"
        echo "  ✓ Updated PROJECT_STATUS.md"
    fi
    
    echo "Version sync complete!"
}

# If script is run directly, sync version
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    sync_version "$@"
fi

