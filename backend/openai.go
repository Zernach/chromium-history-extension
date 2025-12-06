package backend

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	openAIAPIURL = "https://api.openai.com/v1/chat/completions"
	openAIModel  = "gpt-4o-mini"
	maxTokens    = 1000
	temperature  = 0.7
)

// OpenAIClient handles communication with the OpenAI API
type OpenAIClient struct {
	APIKey     string
	HTTPClient *http.Client
}

// NewOpenAIClient creates a new OpenAI client
func NewOpenAIClient(apiKey string) *OpenAIClient {
	return &OpenAIClient{
		APIKey: apiKey,
		HTTPClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// formatHistoryForLLM converts history entries to a readable format for the LLM
func formatHistoryForLLM(history []HistoryEntry) string {
	if len(history) == 0 {
		return "No browsing history available."
	}

	var builder strings.Builder
	builder.WriteString("Recent browsing history:\n\n")

	for i, entry := range history {
		// Limit to first 50 entries to avoid token limits
		if i >= 50 {
			builder.WriteString(fmt.Sprintf("\n... and %d more entries", len(history)-50))
			break
		}

		// Format timestamp
		timestamp := time.Unix(entry.LastVisitTime/1000, 0).Format("2006-01-02 15:04")
		
		builder.WriteString(fmt.Sprintf("%d. %s\n", i+1, entry.Title))
		builder.WriteString(fmt.Sprintf("   URL: %s\n", entry.URL))
		builder.WriteString(fmt.Sprintf("   Last visited: %s (visited %d times)\n\n", timestamp, entry.VisitCount))
	}

	return builder.String()
}

// buildSystemPrompt creates the system prompt with history context
func buildSystemPrompt(historyContext string) string {
	return fmt.Sprintf(`You are a helpful assistant that helps users understand and explore their browser history.

%s

Please answer the user's question based on this browsing history. Be concise and helpful. If the history doesn't contain relevant information, let the user know.`, historyContext)
}

// SendChatMessage sends a message to OpenAI with history context
func (c *OpenAIClient) SendChatMessage(userMessage string, history []HistoryEntry) (string, error) {
	if c.APIKey == "" {
		return "", fmt.Errorf("OpenAI API key not configured")
	}

	// Format history for LLM
	historyContext := formatHistoryForLLM(history)
	systemPrompt := buildSystemPrompt(historyContext)

	// Prepare request
	request := OpenAIRequest{
		Model:       openAIModel,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Messages: []OpenAIMessage{
			{
				Role:    "system",
				Content: systemPrompt,
			},
			{
				Role:    "user",
				Content: userMessage,
			},
		},
	}

	// Marshal request to JSON
	requestBody, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", openAIAPIURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))

	// Send request
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// Handle error responses
	if resp.StatusCode != http.StatusOK {
		var openAIErr OpenAIError
		if err := json.Unmarshal(body, &openAIErr); err == nil && openAIErr.Error.Message != "" {
			if resp.StatusCode == http.StatusUnauthorized {
				return "", fmt.Errorf("invalid OpenAI API key")
			} else if resp.StatusCode == http.StatusTooManyRequests {
				return "", fmt.Errorf("OpenAI rate limit exceeded. Please try again later")
			}
			return "", fmt.Errorf("OpenAI API error: %s", openAIErr.Error.Message)
		}
		return "", fmt.Errorf("OpenAI API error: status %d", resp.StatusCode)
	}

	// Parse successful response
	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(openAIResp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return openAIResp.Choices[0].Message.Content, nil
}

