package backend

// HistoryEntry represents a single browsing history entry
type HistoryEntry struct {
	URL           string `json:"url"`
	Title         string `json:"title"`
	VisitCount    int    `json:"visit_count"`
	LastVisitTime int64  `json:"last_visit_time"`
}

// ChatRequest represents the incoming request from the frontend
type ChatRequest struct {
	Message string         `json:"message"`
	History []HistoryEntry `json:"history"`
}

// ChatResponse represents the response sent back to the frontend
type ChatResponse struct {
	Reply string `json:"reply,omitempty"`
	Error string `json:"error,omitempty"`
}

// OpenAIMessage represents a message in the OpenAI chat format
type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIRequest represents the request to OpenAI API
type OpenAIRequest struct {
	Model       string          `json:"model"`
	Messages    []OpenAIMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens"`
}

// OpenAIChoice represents a single choice in the OpenAI response
type OpenAIChoice struct {
	Message      OpenAIMessage `json:"message"`
	FinishReason string        `json:"finish_reason"`
	Index        int           `json:"index"`
}

// OpenAIResponse represents the response from OpenAI API
type OpenAIResponse struct {
	ID      string         `json:"id"`
	Object  string         `json:"object"`
	Created int64          `json:"created"`
	Model   string         `json:"model"`
	Choices []OpenAIChoice `json:"choices"`
	Usage   struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// OpenAIError represents an error response from OpenAI API
type OpenAIError struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

