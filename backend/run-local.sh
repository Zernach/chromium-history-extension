#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building and running backend locally...${NC}\n"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}✗ Go is not installed${NC}"
    echo -e "${YELLOW}Install Go:${NC}"
    echo "  macOS: brew install go"
    echo "  Or download from: https://go.dev/dl/"
    exit 1
fi

echo -e "${GREEN}✓ Go found: $(go version)${NC}"

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}! OPENAI_API_KEY environment variable not set${NC}"
    echo -e "${YELLOW}Set it with: export OPENAI_API_KEY='sk-your-key-here'${NC}"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ OPENAI_API_KEY is set${NC}"
fi

# Download dependencies
echo -e "\n${GREEN}Downloading dependencies...${NC}"
go mod download

# Build the local server
echo -e "\n${GREEN}Building local server...${NC}"
go build -o bin/local-server ./cmd/local

# Run the server
echo -e "\n${GREEN}Starting server...${NC}"
echo -e "${YELLOW}Server will be available at: http://localhost:8080${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

PORT=${PORT:-8080}
./bin/local-server

