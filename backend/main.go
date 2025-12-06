package backend

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

var (
	openAIClient *OpenAIClient
	rateLimiter  *RateLimiter
)

func init() {
	// Initialize OpenAI client with API key from environment
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: OPENAI_API_KEY environment variable not set")
	}
	openAIClient = NewOpenAIClient(apiKey)

	// Initialize rate limiter: 10 requests per minute per IP, burst of 5
	rateLimiter = NewRateLimiter(10.0/60.0, 5)
	rateLimiter.StartCleanup(10 * time.Minute)

	log.Println("Cloud Function initialized successfully")
}

// setCORSHeaders sets CORS headers for the response
func setCORSHeaders(w http.ResponseWriter) {
	// Allow requests from Chrome extensions
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Max-Age", "3600")
}

// sendJSONResponse sends a JSON response
func sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// sendErrorResponse sends an error response
func sendErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	sendJSONResponse(w, statusCode, ChatResponse{Error: message})
}

// ChatWithHistory is the main Cloud Function handler
func ChatWithHistory(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	setCORSHeaders(w)

	// Handle preflight requests
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// Only accept POST requests
	if r.Method != http.MethodPost {
		sendErrorResponse(w, http.StatusMethodNotAllowed, "Only POST method is allowed")
		return
	}

	// Apply rate limiting
	ip := getClientIP(r)
	if !rateLimiter.Allow(ip) {
		log.Printf("Rate limit exceeded for IP: %s", ip)
		sendErrorResponse(w, http.StatusTooManyRequests, "Rate limit exceeded. Please try again later.")
		return
	}

	// Parse request body
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to parse request: %v", err)
		sendErrorResponse(w, http.StatusBadRequest, "Invalid request format")
		return
	}

	// Validate request
	if req.Message == "" {
		sendErrorResponse(w, http.StatusBadRequest, "Message is required")
		return
	}

	if openAIClient.APIKey == "" {
		log.Println("ERROR: OpenAI API key not configured")
		sendErrorResponse(w, http.StatusInternalServerError, "Backend not properly configured")
		return
	}

	// Log request (without sensitive data)
	log.Printf("Processing chat request from IP: %s, history entries: %d", ip, len(req.History))

	// Call OpenAI API
	reply, err := openAIClient.SendChatMessage(req.Message, req.History)
	if err != nil {
		log.Printf("OpenAI API error: %v", err)
		sendErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get response: %v", err))
		return
	}

	// Send successful response
	log.Printf("Successfully processed request for IP: %s", ip)
	sendJSONResponse(w, http.StatusOK, ChatResponse{Reply: reply})
}

