# Backend Deployment Guide

This guide walks you through deploying the Go Cloud Function backend and connecting it to your Chrome extension.

## Prerequisites Checklist

- [ ] Google Cloud Platform account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] OpenAI API key ready
- [ ] Chrome extension source code

## Step-by-Step Deployment

### Step 1: Initial Setup

```bash
cd backend
chmod +x setup.sh deploy.sh
./setup.sh
```

The setup script will:
1. Verify your gcloud installation
2. Prompt for your GCP Project ID
3. Enable required APIs (Cloud Functions, Cloud Build, Secret Manager)
4. Optionally store your OpenAI API key in Secret Manager

**Important**: When prompted, enter your OpenAI API key. It will be stored securely in Google Secret Manager.

### Step 2: Configure Settings

Edit `config.sh` if you want to customize:
- Region (default: `us-central1`)
- Function name (default: `chromium-history-chat`)
- Memory allocation (default: `512MB`)
- Timeout (default: `60s`)
- Max instances (default: `10`)

```bash
nano config.sh  # or use your preferred editor
```

### Step 3: Deploy the Function

```bash
./deploy.sh
```

This will:
1. Build the Go function
2. Deploy to Google Cloud
3. Configure environment variables/secrets
4. Set up CORS and permissions
5. Display your function URL

**Save the Function URL** that is displayed at the end:
```
Function URL:
https://chromium-history-chat-pv3keymiya-uc.a.run.app
```

The URL is also saved to `function_url.txt` for your reference.

### Step 4: Update the Chrome Extension

1. Open the service worker file:
   ```bash
   cd ../chromium-extension/extension/background
   nano service_worker.js
   ```

2. Find this line near the top:
   ```javascript
   const BACKEND_URL = 'https://chromium-history-chat-pv3keymiya-uc.a.run.app';
   ```

3. Replace with your actual function URL from Step 3

4. Save the file

### Step 5: Rebuild the Extension

```bash
cd ../../chromium-extension
make build
# or
./build.sh
```

### Step 6: Test the Deployment

#### Test Backend Directly

```bash
curl -X POST https://your-function-url.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What websites did I visit?",
    "history": [
      {
        "url": "https://example.com",
        "title": "Example Site",
        "visit_count": 3,
        "last_visit_time": 1702345678000
      }
    ]
  }'
```

Expected response:
```json
{
  "reply": "Based on your browsing history, you visited Example Site..."
}
```

#### Test in Chrome Extension

1. Load the extension in Chrome (`chrome://extensions/`)
2. Click the extension icon
3. Type a message like "What did I visit recently?"
4. You should get a response from the AI

## Troubleshooting

### "Backend connection issue" in extension

**Cause**: The extension can't reach the backend URL

**Solutions**:
1. Verify the URL in `service_worker.js` matches your deployed function
2. Check that the function deployed successfully: `gcloud functions describe chromium-history-chat --gen2 --region=us-central1`
3. Test the backend URL directly with curl (see above)

### "Rate limit exceeded" errors

**Cause**: Too many requests from the same IP

**Solutions**:
1. Wait 1 minute and try again
2. Increase rate limits in `backend/main.go` (line with `NewRateLimiter`)
3. Redeploy: `./deploy.sh`

### "Backend not properly configured" error

**Cause**: OpenAI API key not set in the backend

**Solutions**:
1. Verify secret exists: `gcloud secrets describe openai-api-key --project=YOUR_PROJECT_ID`
2. Re-run setup to add key: `./setup.sh`
3. Or set as environment variable and redeploy

### Function deployment fails

**Check logs**:
```bash
gcloud functions logs read chromium-history-chat \
  --gen2 \
  --region=us-central1 \
  --limit=50
```

**Common issues**:
- Billing not enabled: Enable at https://console.cloud.google.com/billing
- APIs not enabled: Re-run `./setup.sh`
- Invalid API key: Check Secret Manager or environment variable

## Monitoring and Maintenance

### View Logs

Real-time:
```bash
gcloud functions logs read chromium-history-chat \
  --gen2 \
  --region=us-central1 \
  --follow
```

Recent logs:
```bash
gcloud functions logs read chromium-history-chat \
  --gen2 \
  --region=us-central1 \
  --limit=100
```

### Update the Function

After making code changes:
```bash
cd backend
./deploy.sh
```

No need to update the extension unless the function URL changed.

### Check Function Status

```bash
gcloud functions describe chromium-history-chat \
  --gen2 \
  --region=us-central1
```

### Rotate OpenAI API Key

```bash
# Update secret
echo -n "sk-new-api-key" | gcloud secrets versions add openai-api-key --data-file=-

# Function will automatically use new version
```

## Cost Management

### Monitor Costs

View costs in Google Cloud Console:
1. Go to: https://console.cloud.google.com/billing
2. Select your project
3. View "Reports" for cost breakdown

### Typical Monthly Costs (Estimates)

**For 1,000 requests/month**:
- Cloud Functions: ~$0.50
- OpenAI API: ~$1-5 (depends on history size)
- Total: ~$1.50-5.50/month

**For 10,000 requests/month**:
- Cloud Functions: ~$5
- OpenAI API: ~$10-50
- Total: ~$15-55/month

### Reduce Costs

1. **Decrease max instances**: Edit `config.sh`, set `FUNCTION_MAX_INSTANCES=5`
2. **Reduce memory**: Edit `config.sh`, set `FUNCTION_MEMORY=256MB`
3. **Stricter rate limiting**: Edit `main.go`, reduce requests per minute
4. **Delete function when not in use**: `gcloud functions delete chromium-history-chat --gen2 --region=us-central1`

## Security Best Practices

1. **Use Secret Manager** for API keys (not environment variables)
2. **Enable Cloud Armor** for DDoS protection (optional, additional cost)
3. **Review logs regularly** for suspicious activity
4. **Set billing alerts** to prevent unexpected costs
5. **Restrict CORS** to your extension ID (see backend README)

## Next Steps

- ✅ Backend deployed
- ✅ Extension updated with backend URL
- ✅ Extension rebuilt and tested
- ⬜ Share extension with users
- ⬜ Set up monitoring alerts
- ⬜ Configure billing alerts

## Support

For issues:
1. Check troubleshooting section above
2. Review Cloud Function logs
3. Test backend endpoint directly with curl
4. Verify extension console for errors (F12 in popup)

## Updating After Deployment

If you make changes to the backend code:

```bash
cd backend
./deploy.sh
```

If you need to change configuration:

```bash
cd backend
nano config.sh  # Make changes
./deploy.sh      # Redeploy with new config
```

## Cleanup (Deleting Everything)

To completely remove the backend:

```bash
# Delete the function
gcloud functions delete chromium-history-chat \
  --gen2 \
  --region=us-central1

# Delete the secret (optional)
gcloud secrets delete openai-api-key
```

This stops all charges related to the Cloud Function.

