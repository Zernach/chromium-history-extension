# Backend Plan: Go + Google Cloud Functions

## Overview

This document outlines the architecture and implementation plan for a Go-based backend deployed on Google Cloud Functions. The backend will receive chat messages and Chrome browsing history from the frontend extension, process them, call OpenAI GPT-4o-mini, and return results.

## Architecture

### High-Level Flow

```
┌─────────────────┐
│ Chrome Extension │
│   (Frontend)    │
└────────┬────────┘
         │
         │ POST /chat
         │ { message, history, apiKey }
         ▼
┌─────────────────────────────────────┐
│   Google Cloud Function (Go)        │
│   ┌───────────────────────────────┐ │
│   │  HTTP Handler                 │ │
│   │  - Validate request           │ │
│   │  - Process history data       │ │
│   │  - Format for OpenAI          │ │
│   └───────────┬───────────────────┘ │
│               │                      │
│   ┌───────────▼───────────────────┐ │
│   │  OpenAI Client                │ │
│   │  - Build prompt                │ │
│   │  - Call GPT-4o-mini           │ │
│   │  - Handle errors               │ │
│   └───────────┬───────────────────┘ │
└───────────────┼─────────────────────┘
                │
                │ Response
                ▼
         ┌──────────────┐
         │   Frontend   │
         └──────────────┘
```

## Project Structure

```
backend/
├── cmd/
│   └── function/
│       └── main.go              # Cloud Function entry point
├── internal/
│   ├── handler/
│   │   └── chat.go             # HTTP request handler
│   ├── openai/
│   │   └── client.go           # OpenAI API client
│   ├── models/
│   │   ├── request.go          # Request structs
│   │   └── response.go         # Response structs
│   └── utils/
│       ├── validator.go        # Input validation
│       └── formatter.go        # History formatting utilities
├── go.mod                      # Go module file
├── go.sum                      # Go dependencies checksum
├── deploy.sh                   # Deployment script
├── .gcloudignore              # Files to exclude from deployment
├── .env.example               # Example environment variables
└── README.md                  # Backend documentation
```

## Implementation Details

### 1. Go Module Setup

**File: `go.mod`**
- Module name: `github.com/yourusername/chromium-history-extension/backend`
- Go version: 1.21+
- Dependencies:
  - `github.com/GoogleCloudPlatform/functions-framework-go` - Cloud Functions framework
  - `github.com/gin-gonic/gin` or `net/http` - HTTP handling
  - `github.com/openai/openai-go` - OpenAI Go SDK (or use `net/http` directly)
  - `github.com/google/uuid` - Request ID generation
  - `golang.org/x/time/rate` - Rate limiting (optional)

### 2. Cloud Function Entry Point

**File: `cmd/function/main.go`**
- Uses Functions Framework for Go
- Registers HTTP handler
- Sets up logging
- Handles CORS (if needed)
- Environment variable configuration

### 3. Request Handler

**File: `internal/handler/chat.go`**
- HTTP handler function
- Request validation:
  - Validate JSON structure
  - Check required fields (message, history, apiKey)
  - Validate API key format
  - Validate history data structure
- Process history data:
  - Format history entries for OpenAI context
  - Limit context size (token counting)
  - Build system prompt
- Call OpenAI client
- Format and return response
- Error handling and logging

### 4. OpenAI Client

**File: `internal/openai/client.go`**
- OpenAI API client wrapper
- Methods:
  - `SendChatMessage(message, historyContext, apiKey) (string, error)`
  - `BuildSystemPrompt(historyContext string) string`
- Error handling:
  - 401: Invalid API key
  - 429: Rate limit (with retry logic)
  - 500+: Server errors
  - Network timeouts
- Request timeout configuration
- Retry logic for transient failures

### 5. Data Models

**File: `internal/models/request.go`**
```go
type ChatRequest struct {
    Message     string        `json:"message" binding:"required"`
    History     []HistoryEntry `json:"history" binding:"required"`
    APIKey      string        `json:"apiKey" binding:"required"`
}

type HistoryEntry struct {
    URL          string  `json:"url"`
    Title        string  `json:"title"`
    VisitCount   int     `json:"visitCount"`
    LastVisitTime int64  `json:"lastVisitTime"`
}
```

**File: `internal/models/response.go`**
```go
type ChatResponse struct {
    Reply     string `json:"reply"`
    RequestID string `json:"requestId,omitempty"`
}

type ErrorResponse struct {
    Error     string `json:"error"`
    RequestID string `json:"requestId,omitempty"`
    Code      string `json:"code,omitempty"`
}
```

### 6. Utilities

**File: `internal/utils/validator.go`**
- Validate API key format (starts with "sk-", minimum length)
- Validate history entries structure
- Validate message length
- Sanitize inputs

**File: `internal/utils/formatter.go`**
- Format history entries for LLM context
- Limit context size (approximate token counting)
- Format dates/timestamps
- Build readable history summary

### 7. Deployment Script

**File: `deploy.sh`**
```bash
#!/bin/bash
# Script to deploy Cloud Function using gcloud CLI

# Configuration
FUNCTION_NAME="chromium-history-chat"
REGION="us-central1"
RUNTIME="go121"
ENTRY_POINT="ChatHandler"
MEMORY="256MB"
TIMEOUT="60s"
MAX_INSTANCES="10"

# Build and deploy
gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=$RUNTIME \
  --region=$REGION \
  --source=. \
  --entry-point=$ENTRY_POINT \
  --trigger-http \
  --allow-unauthenticated \
  --memory=$MEMORY \
  --timeout=$TIMEOUT \
  --max-instances=$MAX_INSTANCES \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)"
```

### 8. Environment Configuration

**File: `.env.example`**
```
# OpenAI Configuration (optional - can be passed in request)
# OPENAI_API_BASE_URL=https://api.openai.com/v1

# Function Configuration
# MAX_HISTORY_ENTRIES=100
# MAX_CONTEXT_TOKENS=4000
# REQUEST_TIMEOUT_SECONDS=30
```

## API Specification

### Endpoint: POST /chat

**Request Body:**
```json
{
  "message": "What websites did I visit yesterday?",
  "history": [
    {
      "url": "https://example.com",
      "title": "Example Site",
      "visitCount": 5,
      "lastVisitTime": 1234567890000
    }
  ],
  "apiKey": "sk-..."
}
```

**Success Response (200):**
```json
{
  "reply": "Based on your browsing history, you visited...",
  "requestId": "uuid-here"
}
```

**Error Responses:**

400 Bad Request:
```json
{
  "error": "Missing required field: message",
  "code": "VALIDATION_ERROR",
  "requestId": "uuid-here"
}
```

401 Unauthorized:
```json
{
  "error": "Invalid OpenAI API key",
  "code": "INVALID_API_KEY",
  "requestId": "uuid-here"
}
```

429 Too Many Requests:
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT",
  "requestId": "uuid-here"
}
```

500 Internal Server Error:
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "uuid-here"
}
```

## Security Considerations

### 1. API Key Handling
- **Option A (Current Plan):** API key passed in request body
  - Pros: Simple, no backend storage needed
  - Cons: API key visible in logs (mitigate with request logging off)
- **Option B (Future Enhancement):** Store API keys in Secret Manager
  - User authenticates with extension
  - Backend retrieves API key from Secret Manager
  - More secure but requires authentication system

### 2. Input Validation
- Validate all inputs
- Sanitize user messages
- Limit history array size
- Limit message length
- Rate limiting per IP/user

### 3. CORS Configuration
- Configure CORS headers appropriately
- Only allow requests from extension origin
- Validate Origin header

### 4. Error Handling
- Don't expose internal errors to clients
- Log errors server-side
- Return generic error messages to clients
- Include request IDs for debugging

### 5. Request Logging
- Log request metadata (not API keys or full history)
- Use structured logging
- Include request IDs
- Monitor for abuse

## Performance Considerations

### 1. Cold Start Mitigation
- Use minimum instances (1) to keep function warm
- Optimize Go binary size
- Minimize dependencies

### 2. Response Time
- Set appropriate timeout (60s)
- Implement request timeout handling
- Use connection pooling for OpenAI API

### 3. Memory Management
- Limit history processing memory
- Stream large responses if needed
- Monitor memory usage

### 4. Cost Optimization
- Set max instances limit
- Use appropriate memory allocation
- Monitor function invocations

## Deployment Steps

### Prerequisites
1. Install Google Cloud SDK (`gcloud`)
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`
4. Enable Cloud Functions API: `gcloud services enable cloudfunctions.googleapis.com`
5. Enable Cloud Build API: `gcloud services enable cloudbuild.googleapis.com`

### Initial Setup
1. Create Go module: `go mod init`
2. Install dependencies: `go mod tidy`
3. Test locally (if using Functions Framework)
4. Build: `go build -o function cmd/function/main.go`

### Deployment
1. Make deploy script executable: `chmod +x deploy.sh`
2. Run deployment: `./deploy.sh`
3. Get function URL: `gcloud functions describe $FUNCTION_NAME --gen2 --region=$REGION --format="value(serviceConfig.uri)"`

### Testing
1. Test with curl or Postman
2. Test from extension frontend
3. Monitor logs: `gcloud functions logs read $FUNCTION_NAME --gen2 --region=$REGION`

## Development Workflow

### Local Development
1. Use Functions Framework for local testing:
   ```bash
   functions-framework --target=ChatHandler --port=8080
   ```
2. Test with local requests
3. Use environment variables for configuration

### Testing
1. Unit tests for each package
2. Integration tests with mock OpenAI API
3. End-to-end tests with test requests

### Monitoring
- Cloud Functions logs
- Error reporting
- Performance metrics
- Cost tracking

## Future Enhancements

1. **Authentication System**
   - User authentication
   - API key storage in Secret Manager
   - User-specific rate limiting

2. **Caching**
   - Cache common queries
   - Cache formatted history contexts
   - Reduce OpenAI API calls

3. **Streaming Responses**
   - Support streaming from OpenAI
   - Stream responses to frontend
   - Better UX for long responses

4. **History Processing**
   - Move history processing to backend
   - More efficient filtering
   - Better context building

5. **Multiple LLM Providers**
   - Support for other providers (Anthropic, etc.)
   - Provider abstraction layer
   - Fallback mechanisms

6. **Analytics**
   - Usage tracking
   - Performance metrics
   - Error tracking

## Migration from Frontend

### Frontend Changes Required
1. Update service worker to call backend instead of OpenAI directly
2. Remove OpenAI API key from chrome.storage (or keep for backward compatibility)
3. Update error handling for backend responses
4. Add backend URL configuration in options page
5. Handle CORS if needed

### Backward Compatibility
- Support both direct OpenAI calls and backend calls
- Feature flag to switch between modes
- Gradual migration path

## Cost Estimation

### Cloud Functions Pricing
- **Invocations:** $0.40 per million requests
- **Compute Time:** $0.0000025 per GB-second
- **Memory:** Based on allocated memory

### Example Monthly Cost (1000 users, 10 requests/user/day)
- Requests: 300,000/month = $0.12
- Compute: ~$5-10 (depending on execution time)
- **Total: ~$5-15/month** (excluding OpenAI API costs)

## Timeline

### Phase 1: Core Implementation (Week 1)
- [ ] Set up Go module and project structure
- [ ] Implement basic HTTP handler
- [ ] Implement OpenAI client
- [ ] Basic request/response models
- [ ] Local testing

### Phase 2: Deployment & Integration (Week 2)
- [ ] Create deployment script
- [ ] Deploy to Cloud Functions
- [ ] Test deployed function
- [ ] Update frontend to use backend
- [ ] End-to-end testing

### Phase 3: Polish & Optimization (Week 3)
- [ ] Error handling improvements
- [ ] Logging and monitoring
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation

## Dependencies

### Required Go Packages
```go
require (
    github.com/GoogleCloudPlatform/functions-framework-go v1.8.0
    github.com/gin-gonic/gin v1.9.1
    github.com/google/uuid v1.3.0
    golang.org/x/time v0.3.0
)
```

### Optional Packages
- Structured logging: `github.com/sirupsen/logrus` or `go.uber.org/zap`
- Configuration: `github.com/spf13/viper`
- Testing: `github.com/stretchr/testify`

## Notes

- Google Cloud Functions Gen2 is recommended for better performance and features
- Consider using Cloud Run if you need more control or longer execution times
- API keys in request body is acceptable for MVP, but consider Secret Manager for production
- Monitor function cold starts and adjust minimum instances accordingly
- Set up alerting for errors and high latency

