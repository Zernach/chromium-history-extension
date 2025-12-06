use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Data structures for browser history

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    #[wasm_bindgen(readonly)]
    pub url: String,
    #[wasm_bindgen(readonly)]
    pub title: String,
    #[wasm_bindgen(readonly)]
    pub visit_count: u32,
    #[wasm_bindgen(readonly)]
    pub last_visit_time: f64, // Chrome timestamp (microseconds since epoch)
}

#[wasm_bindgen]
impl HistoryEntry {
    #[wasm_bindgen(constructor)]
    pub fn new(url: String, title: String, visit_count: u32, last_visit_time: f64) -> HistoryEntry {
        HistoryEntry {
            url,
            title,
            visit_count,
            last_visit_time,
        }
    }
}

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryQuery {
    #[wasm_bindgen(readonly)]
    pub text: String,
    pub start_time: Option<f64>,
    pub end_time: Option<f64>,
    #[wasm_bindgen(readonly)]
    pub max_results: u32,
}

#[wasm_bindgen]
impl HistoryQuery {
    #[wasm_bindgen(constructor)]
    pub fn new(text: String, max_results: u32) -> HistoryQuery {
        HistoryQuery {
            text,
            start_time: None,
            end_time: None,
            max_results,
        }
    }
}

// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Optional: Setup panic hook for better error messages
}

// Stop words to filter out (common words with little meaning)
const STOP_WORDS: &[&str] = &[
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "up", "about", "into", "through", "during",
    "i", "me", "my", "you", "your", "we", "us", "our", "they", "them", "their",
    "is", "am", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "this", "that", "these", "those", "what", "when", "where", "who", "which", "how",
];

// Extract keywords from a query (remove stop words, split on whitespace)
#[wasm_bindgen]
pub fn extract_keywords(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split_whitespace()
        .map(|word| {
            // Remove punctuation from word
            word.chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>()
        })
        .filter(|word| {
            // Filter out stop words and very short words
            !word.is_empty() && word.len() > 2 && !STOP_WORDS.contains(&word.as_str())
        })
        .collect()
}

// Extract domain from URL
fn extract_domain(url: &str) -> String {
    // Simple domain extraction
    if let Some(start) = url.find("://") {
        let after_protocol = &url[start + 3..];
        if let Some(end) = after_protocol.find('/') {
            return after_protocol[..end].to_string();
        }
        return after_protocol.to_string();
    }
    url.to_string()
}

// Calculate relevance score for a history entry based on keywords
fn calculate_relevance_score(entry: &HistoryEntry, keywords: &[String], current_time: f64) -> f64 {
    let mut score = 0.0;

    let url_lower = entry.url.to_lowercase();
    let title_lower = entry.title.to_lowercase();

    // Keyword matching scores
    for keyword in keywords {
        // Title matches are worth more
        if title_lower.contains(keyword) {
            score += 3.0;
        }
        // URL matches
        if url_lower.contains(keyword) {
            score += 2.0;
        }
    }

    // Visit count bonus (logarithmic scale to avoid over-weighting)
    score += (entry.visit_count as f64).ln() * 0.5;

    // Recency bonus (more recent = higher score)
    let time_diff = current_time - entry.last_visit_time;
    let days_old = time_diff / (1000.0 * 60.0 * 60.0 * 24.0);

    // Decay factor: recent visits get more weight
    if days_old < 1.0 {
        score += 2.0; // Visited today
    } else if days_old < 7.0 {
        score += 1.0; // Visited this week
    } else if days_old < 30.0 {
        score += 0.5; // Visited this month
    }

    score
}

// Basic filtering functions

#[wasm_bindgen]
pub fn filter_history_by_date_range(
    entries: JsValue,
    start_time: f64,
    end_time: f64,
) -> Result<JsValue, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    let filtered: Vec<HistoryEntry> = entries
        .into_iter()
        .filter(|entry| entry.last_visit_time >= start_time && entry.last_visit_time <= end_time)
        .collect();

    serde_wasm_bindgen::to_value(&filtered)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[wasm_bindgen]
pub fn filter_history_by_keywords(
    entries: JsValue,
    keywords: Vec<String>,
) -> Result<JsValue, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    let keywords_lower: Vec<String> = keywords.iter().map(|k| k.to_lowercase()).collect();

    let filtered: Vec<HistoryEntry> = entries
        .into_iter()
        .filter(|entry| {
            let url_lower = entry.url.to_lowercase();
            let title_lower = entry.title.to_lowercase();
            keywords_lower.iter().any(|keyword| {
                url_lower.contains(keyword) || title_lower.contains(keyword)
            })
        })
        .collect();

    serde_wasm_bindgen::to_value(&filtered)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[wasm_bindgen]
pub fn sort_history_by_relevance(entries: JsValue) -> Result<JsValue, JsValue> {
    let mut entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    // Sort by visit count (descending) and then by last visit time (descending)
    entries.sort_by(|a, b| {
        b.visit_count
            .cmp(&a.visit_count)
            .then_with(|| b.last_visit_time.partial_cmp(&a.last_visit_time).unwrap_or(std::cmp::Ordering::Equal))
    });

    serde_wasm_bindgen::to_value(&entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

// Advanced: Sort by relevance with keyword matching
#[wasm_bindgen]
pub fn sort_by_relevance_with_keywords(
    entries: JsValue,
    keywords: Vec<String>,
    current_time: f64,
) -> Result<JsValue, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    let keywords_lower: Vec<String> = keywords.iter().map(|k| k.to_lowercase()).collect();

    // Calculate scores for all entries
    let mut scored_entries: Vec<(HistoryEntry, f64)> = entries
        .into_iter()
        .map(|entry| {
            let score = calculate_relevance_score(&entry, &keywords_lower, current_time);
            (entry, score)
        })
        .collect();

    // Sort by score (descending)
    scored_entries.sort_by(|a, b| {
        b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
    });

    // Extract entries
    let sorted: Vec<HistoryEntry> = scored_entries
        .into_iter()
        .map(|(entry, _)| entry)
        .collect();

    serde_wasm_bindgen::to_value(&sorted)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[wasm_bindgen]
pub fn limit_history_results(entries: JsValue, max_count: usize) -> Result<JsValue, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    let limited: Vec<HistoryEntry> = entries.into_iter().take(max_count).collect();

    serde_wasm_bindgen::to_value(&limited)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[wasm_bindgen]
pub fn format_history_for_llm(entries: JsValue, max_chars: usize) -> Result<String, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    let mut result = String::new();
    let mut char_count = 0;

    for entry in entries {
        // Format timestamp as human-readable date
        let timestamp_seconds = entry.last_visit_time / 1000.0;
        let days_ago = (chrono::Utc::now().timestamp() as f64 - timestamp_seconds) / 86400.0;

        let time_str = if days_ago < 1.0 {
            "Today".to_string()
        } else if days_ago < 2.0 {
            "Yesterday".to_string()
        } else if days_ago < 7.0 {
            format!("{} days ago", days_ago.floor())
        } else {
            format!("{} weeks ago", (days_ago / 7.0).floor())
        };

        let formatted = format!(
            "URL: {}\nTitle: {}\nVisits: {}\nLast Visit: {}\n\n",
            entry.url, entry.title, entry.visit_count, time_str
        );

        if char_count + formatted.len() > max_chars {
            break;
        }

        result.push_str(&formatted);
        char_count += formatted.len();
    }

    Ok(result)
}

// Analyze domain patterns in history
#[wasm_bindgen]
pub fn analyze_domain_patterns(entries: JsValue) -> Result<JsValue, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    let mut domain_stats: HashMap<String, (u32, u32)> = HashMap::new();

    for entry in entries {
        let domain = extract_domain(&entry.url);
        let stats = domain_stats.entry(domain).or_insert((0, 0));
        stats.0 += 1; // count
        stats.1 += entry.visit_count; // total visits
    }

    // Convert to sorted vec
    let mut domain_vec: Vec<(String, u32, u32)> = domain_stats
        .into_iter()
        .map(|(domain, (count, visits))| (domain, count, visits))
        .collect();

    // Sort by visit count (descending)
    domain_vec.sort_by(|a, b| b.2.cmp(&a.2));

    // Format as JSON string (simplified)
    let result: Vec<_> = domain_vec
        .into_iter()
        .take(20)
        .map(|(domain, count, visits)| {
            serde_json::json!({
                "domain": domain,
                "entry_count": count,
                "total_visits": visits
            })
        })
        .collect();

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

// Combined query function: filter, score, and sort
#[wasm_bindgen]
pub fn find_relevant_history(
    entries: JsValue,
    query: &str,
    max_results: usize,
    current_time: f64,
) -> Result<JsValue, JsValue> {
    let entries: Vec<HistoryEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    // Extract keywords from query
    let keywords = extract_keywords(query);

    if keywords.is_empty() {
        // No keywords, just sort by recency and visit count
        let sorted_entries = serde_wasm_bindgen::to_value(&entries)?;
        return sort_history_by_relevance(sorted_entries);
    }

    // Filter entries that match keywords
    let filtered: Vec<HistoryEntry> = entries
        .into_iter()
        .filter(|entry| {
            let url_lower = entry.url.to_lowercase();
            let title_lower = entry.title.to_lowercase();
            keywords.iter().any(|keyword| {
                url_lower.contains(keyword) || title_lower.contains(keyword)
            })
        })
        .collect();

    // Score and sort
    let scored_entries = serde_wasm_bindgen::to_value(&filtered)?;
    let sorted = sort_by_relevance_with_keywords(scored_entries, keywords, current_time)?;

    // Limit results
    limit_history_results(sorted, max_results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_entry_creation() {
        let entry = HistoryEntry::new(
            "https://example.com".to_string(),
            "Example".to_string(),
            5,
            1234567890.0,
        );
        assert_eq!(entry.url, "https://example.com");
        assert_eq!(entry.visit_count, 5);
    }

    #[test]
    fn test_history_query_creation() {
        let query = HistoryQuery::new("test query".to_string(), 10);
        assert_eq!(query.text, "test query");
        assert_eq!(query.max_results, 10);
    }

    #[test]
    fn test_extract_keywords() {
        let keywords = extract_keywords("What did I visit about Rust programming?");
        assert!(keywords.contains(&"visit".to_string()));
        assert!(keywords.contains(&"rust".to_string()));
        assert!(keywords.contains(&"programming".to_string()));
        assert!(!keywords.contains(&"what".to_string())); // stop word
        assert!(!keywords.contains(&"did".to_string())); // stop word
    }

    #[test]
    fn test_extract_domain() {
        assert_eq!(extract_domain("https://example.com/path"), "example.com");
        assert_eq!(extract_domain("http://test.org/page"), "test.org");
        assert_eq!(extract_domain("https://sub.domain.com"), "sub.domain.com");
    }

    #[test]
    fn test_relevance_score() {
        let entry = HistoryEntry::new(
            "https://rust-lang.org".to_string(),
            "Rust Programming Language".to_string(),
            10,
            1234567890000.0,
        );
        let keywords = vec!["rust".to_string(), "programming".to_string()];
        let score = calculate_relevance_score(&entry, &keywords, 1234567890000.0);
        assert!(score > 0.0);
    }
}
