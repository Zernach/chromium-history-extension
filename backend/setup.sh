#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Google Cloud setup for Chromium History Extension...${NC}\n"

# Load configuration
if [ -f "config.sh" ]; then
    source config.sh
    echo -e "${GREEN}✓ Loaded configuration from config.sh${NC}"
else
    echo -e "${RED}✗ config.sh not found. Please create it from config.sh.example${NC}"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found. Please install it first:${NC}"
    echo "  https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI found${NC}"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}! Not authenticated. Running gcloud auth login...${NC}"
    gcloud auth login
fi
echo -e "${GREEN}✓ Authenticated with gcloud${NC}"

# Prompt for project ID if not set
if [ "$GCP_PROJECT_ID" = "your-project-id" ]; then
    echo -e "${YELLOW}! Please enter your GCP Project ID:${NC}"
    read -p "Project ID: " GCP_PROJECT_ID
    # Update config.sh
    sed -i.bak "s/your-project-id/$GCP_PROJECT_ID/" config.sh
    echo -e "${GREEN}✓ Updated config.sh with project ID${NC}"
fi

# Set the project
echo -e "\n${GREEN}Setting GCP project to: ${GCP_PROJECT_ID}${NC}"
gcloud config set project "$GCP_PROJECT_ID"

# Check if project exists
if ! gcloud projects describe "$GCP_PROJECT_ID" &> /dev/null; then
    echo -e "${RED}✗ Project ${GCP_PROJECT_ID} not found or you don't have access${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project ${GCP_PROJECT_ID} exists${NC}"

# Check if billing is enabled
echo -e "\n${YELLOW}Checking if billing is enabled...${NC}"
if ! gcloud beta billing projects describe "$GCP_PROJECT_ID" &> /dev/null; then
    echo -e "${RED}✗ Billing not enabled for this project${NC}"
    echo -e "${YELLOW}  Please enable billing at: https://console.cloud.google.com/billing${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Billing is enabled${NC}"

# Enable required APIs
echo -e "\n${GREEN}Enabling required APIs...${NC}"
APIS=(
    "cloudfunctions.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "secretmanager.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo -e "  Enabling ${api}..."
    gcloud services enable "$api" --project="$GCP_PROJECT_ID"
done
echo -e "${GREEN}✓ All required APIs enabled${NC}"

# Set up Secret Manager for OpenAI API key (optional but recommended)
echo -e "\n${YELLOW}Would you like to store the OpenAI API key in Secret Manager? (recommended) [y/N]${NC}"
read -p "Use Secret Manager: " use_secret_manager

if [[ "$use_secret_manager" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Enter your OpenAI API key (starts with sk-):${NC}"
    read -s OPENAI_API_KEY
    echo ""
    
    # Create secret
    echo -e "${GREEN}Creating secret in Secret Manager...${NC}"
    echo -n "$OPENAI_API_KEY" | gcloud secrets create openai-api-key \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$GCP_PROJECT_ID" 2>/dev/null || \
    echo -n "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key \
        --data-file=- \
        --project="$GCP_PROJECT_ID"
    
    echo -e "${GREEN}✓ OpenAI API key stored in Secret Manager${NC}"
    echo -e "${YELLOW}  The deploy script will automatically use this secret${NC}"
else
    echo -e "${YELLOW}! You will need to set the OPENAI_API_KEY environment variable during deployment${NC}"
fi

# Create a service account for the function (optional)
echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Review and update config.sh with your settings"
echo -e "  2. Run ./deploy.sh to deploy the Cloud Function"
echo -e "\n${GREEN}Project: ${GCP_PROJECT_ID}${NC}"
echo -e "${GREEN}Region: ${GCP_REGION}${NC}"
echo -e "${GREEN}Function: ${FUNCTION_NAME}${NC}\n"

