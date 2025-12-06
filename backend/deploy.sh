#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment of Chromium History Extension Cloud Function...${NC}\n"

# Load configuration
if [ -f "config.sh" ]; then
    source config.sh
    echo -e "${GREEN}✓ Loaded configuration from config.sh${NC}"
else
    echo -e "${RED}✗ config.sh not found. Please run setup.sh first${NC}"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found${NC}"
    exit 1
fi

# Validate configuration
if [ "$GCP_PROJECT_ID" = "your-project-id" ]; then
    echo -e "${RED}✗ Please configure GCP_PROJECT_ID in config.sh${NC}"
    exit 1
fi

# Set the project
gcloud config set project "$GCP_PROJECT_ID"

# Set the quota project for Application Default Credentials to match
# This prevents issues when ADC has a quota project from a different account
echo -e "${YELLOW}Setting quota project for Application Default Credentials...${NC}"
gcloud auth application-default set-quota-project "$GCP_PROJECT_ID" 2>/dev/null || {
    echo -e "${YELLOW}⚠ Could not set quota project automatically. If you see quota errors, run:${NC}"
    echo -e "${YELLOW}  gcloud auth application-default set-quota-project $GCP_PROJECT_ID${NC}"
}

# Check if OpenAI API key exists
echo -e "\n${GREEN}Checking for OpenAI API key...${NC}"
USE_SECRET_MANAGER=false

# First check if environment variable is set (fastest check)
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}✓ Using OPENAI_API_KEY from environment${NC}"
else
    # If not in env, check Secret Manager (with timeout to prevent hanging)
    if timeout 5 gcloud secrets describe openai-api-key --project="$GCP_PROJECT_ID" &> /dev/null; then
        echo -e "${GREEN}✓ Found OpenAI API key in Secret Manager${NC}"
        USE_SECRET_MANAGER=true
    else
        echo -e "${RED}✗ OpenAI API key not found${NC}"
        echo -e "${YELLOW}  Please either:${NC}"
        echo -e "${YELLOW}  1. Run setup.sh to store it in Secret Manager${NC}"
        echo -e "${YELLOW}  2. Export OPENAI_API_KEY environment variable${NC}"
        exit 1
    fi
fi

# Build the deployment command
DEPLOY_CMD="gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=go121 \
    --region=$GCP_REGION \
    --entry-point=ChatWithHistory \
    --trigger-http \
    --allow-unauthenticated \
    --memory=$FUNCTION_MEMORY \
    --timeout=$FUNCTION_TIMEOUT \
    --max-instances=$FUNCTION_MAX_INSTANCES"

# Add environment variable or secret
if [ "$USE_SECRET_MANAGER" = true ]; then
    DEPLOY_CMD="$DEPLOY_CMD --set-secrets=OPENAI_API_KEY=openai-api-key:latest"
else
    DEPLOY_CMD="$DEPLOY_CMD --set-env-vars=OPENAI_API_KEY=$OPENAI_API_KEY"
fi

# Deploy the function
echo -e "\n${GREEN}Deploying Cloud Function...${NC}"
echo -e "${YELLOW}Function: ${FUNCTION_NAME}${NC}"
echo -e "${YELLOW}Region: ${GCP_REGION}${NC}"
echo -e "${YELLOW}Memory: ${FUNCTION_MEMORY}${NC}"
echo -e "${YELLOW}Timeout: ${FUNCTION_TIMEOUT}${NC}"
echo -e "${YELLOW}Max Instances: ${FUNCTION_MAX_INSTANCES}${NC}\n"

eval $DEPLOY_CMD

# Get the function URL
echo -e "\n${GREEN}Deployment complete!${NC}"
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME \
    --gen2 \
    --region=$GCP_REGION \
    --format='value(serviceConfig.uri)')

echo -e "\n${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Function deployed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Function URL:${NC}"
echo -e "${GREEN}${FUNCTION_URL}${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Update the frontend service worker with this URL"
echo -e "  2. Test the function with a sample request:\n"
echo -e "${GREEN}curl -X POST ${FUNCTION_URL} \\${NC}"
echo -e "${GREEN}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "${GREEN}  -d '{\"message\": \"What websites did I visit?\", \"history\": []}'${NC}\n"

# Save the function URL to a file for easy reference
echo "$FUNCTION_URL" > function_url.txt
echo -e "${GREEN}✓ Function URL saved to function_url.txt${NC}\n"
