package main

import (
	"log"
	"net/http"
	"os"

	"github.com/zernach/chromium-history-extension/backend"
)

func main() {
	// Check if OPENAI_API_KEY is set
	if os.Getenv("OPENAI_API_KEY") == "" {
		log.Println("WARNING: OPENAI_API_KEY environment variable not set")
		log.Println("Set it with: export OPENAI_API_KEY='sk-your-key-here'")
	}

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Register the handler
	http.HandleFunc("/", backend.ChatWithHistory)

	log.Printf("Starting local server on port %s...", port)
	log.Printf("Server will be available at: http://localhost:%s", port)
	log.Printf("Test with: curl -X POST http://localhost:%s -H 'Content-Type: application/json' -d '{\"message\":\"test\",\"history\":[]}'", port)

	// Start the server
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v\n", err)
	}
}

