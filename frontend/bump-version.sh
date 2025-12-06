#!/bin/bash

# Version bump utility
# Bumps version in manifest.json and syncs to all other files
# Usage: ./bump-version.sh [patch|minor|major]

set -e

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the sync-version script
source "$PROJECT_ROOT/sync-version.sh"

# Function to bump version
bump_version() {
    local BUMP_TYPE="${1:-patch}"
    local MANIFEST_FILE="$PROJECT_ROOT/extension/manifest.json"
    
    # Extract current version
    local CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$MANIFEST_FILE" | cut -d'"' -f4)
    if [ -z "$CURRENT_VERSION" ]; then
        echo "Error: Could not extract version from manifest.json"
        exit 1
    fi
    
    echo "Current version: $CURRENT_VERSION"
    
    # Parse version components
    IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
    local MAJOR="${VERSION_PARTS[0]}"
    local MINOR="${VERSION_PARTS[1]}"
    local PATCH="${VERSION_PARTS[2]}"
    
    # Bump version based on type
    case "$BUMP_TYPE" in
        major)
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
            ;;
        minor)
            MINOR=$((MINOR + 1))
            PATCH=0
            ;;
        patch)
            PATCH=$((PATCH + 1))
            ;;
        *)
            echo "Error: Invalid bump type '$BUMP_TYPE'. Use: patch, minor, or major"
            exit 1
            ;;
    esac
    
    local NEW_VERSION="$MAJOR.$MINOR.$PATCH"
    
    # Update manifest.json (source of truth)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_FILE"
    else
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_FILE"
    fi
    
    # Sync version to all other files
    echo ""
    sync_version "$NEW_VERSION"
    
    echo ""
    echo "Version bumped from $CURRENT_VERSION to $NEW_VERSION"
}

# Run bump_version with provided argument
bump_version "$@"

