# Chromium History Extension - Backend

Go-based Google Cloud Function that serves as a backend proxy for the Chromium History Extension, handling OpenAI API calls server-side.

## Overview

This backend eliminates the need for users to provide their own OpenAI API keys by handling all AI interactions server-side. It receives chat messages and browsing history from the extension frontend, processes the data, calls OpenAI's GPT-4o-mini API, and returns the response.

## Architecture

- **Runtime**: Go 1.21
- **Platform**: Google Cloud Functions (2nd generation)
- **API**: OpenAI GPT-4o-mini
- **Security**: IP-based rate limiting, CORS headers
- **Configuration**: Environment variables or Secret Manager

## Features

- ✅ HTTP Cloud Function with POST endpoint
- ✅ OpenAI GPT-4o-mini integration
- ✅ IP-based rate limiting (10 req/min per IP)
- ✅ CORS support for Chrome extensions
- ✅ Secure API key management via Secret Manager
- ✅ Comprehensive error handling
- ✅ Request validation
- ✅ Cloud Function logging

## Prerequisites

1. **Google Cloud Platform**
   - GCP account with billing enabled
   - Project with Cloud Functions API enabled

2. **gcloud CLI**
   ```bash
   # Install gcloud CLI
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   
   # Authenticate
   gcloud auth login
   ```

3. **OpenAI API Key**
   - Get your API key from: https://platform.openai.com/api-keys

4. **Go** (for local development/testing)
   ```bash
   # macOS
   brew install go
   
   # Verify installation
   go version  # Should be 1.21 or later
   ```

## Quick Start

### 1. Initial Setup

```bash
cd backend

# Make scripts executable
chmod +x setup.sh deploy.sh

# Run setup (configures GCP project and enables APIs)
./setup.sh
```

The setup script will:
- Verify gcloud CLI installation and authentication
- Prompt for your GCP Project ID
- Enable required APIs (Cloud Functions, Cloud Build, Secret Manager)
- Optionally store your OpenAI API key in Secret Manager

### 2. Configuration

Edit `config.sh` to customize your deployment:

```bash
# Google Cloud Configuration
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Function Configuration
export FUNCTION_NAME="chromium-history-chat"
export FUNCTION_MEMORY="512MB"
export FUNCTION_TIMEOUT="60s"
export FUNCTION_MAX_INSTANCES="10"
```

### 3. Deploy

```bash
./deploy.sh
```

The deploy script will:
- Build and deploy the Cloud Function
- Configure environment variables/secrets
- Set up CORS and rate limiting
- Output the function URL

After deployment, you'll see:
```
Function URL:
https://chromium-history-chat-xxxxx-uc.a.run.app
```

Save this URL - you'll need it to configure the frontend.

## Project Structure

```
backend/
├── main.go              # Cloud Function entry point and HTTP handler
├── types.go             # Request/Response struct definitions
├── openai.go            # OpenAI API client implementation
├── rate_limit.go        # Rate limiting middleware
├── go.mod               # Go module dependencies
├── go.sum               # Go dependencies checksum
├── config.sh            # Deployment configuration
├── setup.sh             # Initial setup script
├── deploy.sh            # Deployment script
└── README.md            # This file
```

## API Reference

### Endpoint

**POST** `https://your-function-url.run.app`

### Request Format

```json
{
  "message": "What websites did I visit yesterday?",
  "history": [
    {
      "url": "https://example.com",
      "title": "Example Page",
      "visit_count": 5,
      "last_visit_time": 1702345678000
    }
  ]
}
```

### Response Format

**Success (200)**
```json
{
  "reply": "Based on your browsing history, you visited..."
}
```

**Error (4xx/5xx)**
```json
{
  "error": "Error message describing what went wrong"
}
```

### Status Codes

- `200` - Success
- `400` - Bad Request (invalid JSON or missing fields)
- `405` - Method Not Allowed (only POST accepted)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (OpenAI API error or server issue)

## Rate Limiting

The backend implements IP-based rate limiting to prevent abuse:

- **Rate**: 10 requests per minute per IP address
- **Burst**: 5 requests (allows short bursts)
- **Cleanup**: Removes inactive limiters every 10 minutes

When rate limit is exceeded, the API returns:
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

## Error Handling

The backend handles various error scenarios:

| Error Type | Status Code | Response |
|------------|-------------|----------|
| Invalid JSON | 400 | "Invalid request format" |
| Missing message | 400 | "Message is required" |
| Rate limit exceeded | 429 | "Rate limit exceeded. Please try again later." |
| OpenAI API key invalid | 500 | "Invalid OpenAI API key" |
| OpenAI rate limit | 500 | "OpenAI rate limit exceeded. Please try again later" |
| OpenAI API error | 500 | "OpenAI API error: [details]" |
| No API key configured | 500 | "Backend not properly configured" |

## Security

### API Key Management

**Recommended: Secret Manager**
```bash
# Store API key in Secret Manager during setup
./setup.sh
# Follow prompts to store OpenAI API key
```

**Alternative: Environment Variable**
```bash
export OPENAI_API_KEY="sk-your-key-here"
./deploy.sh
```

### CORS Configuration

The function allows requests from any origin (`*`) to support Chrome extensions. For production, consider restricting to specific origins:

```go
// In main.go, modify setCORSHeaders:
w.Header().Set("Access-Control-Allow-Origin", "chrome-extension://your-extension-id")
```

### No Sensitive Data Logging

The backend logs request metadata but never logs:
- OpenAI API keys
- Full browsing history
- User messages (in production)

## Local Development

### Run Locally

```bash
# Install dependencies
go mod download

# Run with Functions Framework
export OPENAI_API_KEY="sk-your-key"
go run cmd/local/main.go
```

### Test Locally

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What websites did I visit?",
    "history": [
      {
        "url": "https://example.com",
        "title": "Example",
        "visit_count": 1,
        "last_visit_time": 1702345678000
      }
    ]
  }'
```

## Monitoring

### View Logs

```bash
# View recent logs
gcloud functions logs read $FUNCTION_NAME \
  --gen2 \
  --region=$GCP_REGION \
  --limit=50

# Stream logs in real-time
gcloud functions logs read $FUNCTION_NAME \
  --gen2 \
  --region=$GCP_REGION \
  --follow
```

### Metrics

View metrics in Google Cloud Console:
1. Go to Cloud Functions
2. Select your function
3. Click "Metrics" tab

Available metrics:
- Invocations per second
- Execution time
- Memory usage
- Error rate

## Troubleshooting

### Deployment Fails

**Error: Billing not enabled**
```bash
# Enable billing at: https://console.cloud.google.com/billing
```

**Error: API not enabled**
```bash
# Run setup.sh to enable all required APIs
./setup.sh
```

### Function Returns 500

**Check logs:**
```bash
gcloud functions logs read $FUNCTION_NAME --gen2 --region=$GCP_REGION
```

**Common issues:**
- OpenAI API key not set or invalid
- OpenAI rate limit exceeded
- Network timeout (increase timeout in config.sh)

### Rate Limiting Issues

If rate limiting is too strict:
1. Edit `main.go`
2. Modify `NewRateLimiter(10.0/60.0, 5)` parameters
3. Redeploy with `./deploy.sh`

## Cost Estimation

### Google Cloud Functions
- **Free tier**: 2 million invocations/month
- **After free tier**: $0.40 per million invocations
- **Memory**: $0.0000025 per GB-second
- **CPU**: $0.0000100 per GHz-second

### OpenAI API (GPT-4o-mini)
- **Input**: $0.15 per 1M tokens (~750K words)
- **Output**: $0.60 per 1M tokens (~750K words)

**Estimated cost per request**: $0.001 - $0.005 (depending on history size)

## Updating the Function

To update the function after code changes:

```bash
# 1. Make your changes to Go files
# 2. Test locally (optional)
# 3. Deploy
./deploy.sh
```

The deployment script automatically rebuilds and deploys.

## Deleting the Function

```bash
gcloud functions delete $FUNCTION_NAME \
  --gen2 \
  --region=$GCP_REGION
```

## Frontend Integration

After deploying, update the frontend service worker:

1. Note the function URL from deploy output
2. Update `chromium-extension/extension/background/service_worker.js`
3. Replace OpenAI API calls with calls to your function URL

Example:
```javascript
const BACKEND_URL = 'https://your-function-url.run.app';

async function chatWithHistory(params) {
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      history: params.history
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return { reply: data.reply };
}
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloud Function logs
3. Verify configuration in `config.sh`

## License

Part of the Chromium History Extension project.
