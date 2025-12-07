use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Data structures for browser history

// Internal struct for serde deserialization - no wasm_bindgen attributes
// This avoids conflicts between wasm_bindgen and serde_wasm_bindgen
#[derive(Debug, Clone, Serialize, Deserialize)]
struct HistoryEntryInput {
    #[serde(default)]
    url: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    visit_count: u32,
    #[serde(default)]
    last_visit_time: f64,
}

impl HistoryEntryInput {
    fn into_history_entry(self) -> HistoryEntry {
        HistoryEntry {
            url: self.url,
            title: self.title,
            visit_count: self.visit_count,
            last_visit_time: self.last_visit_time,
        }
    }
}

// Public struct for wasm_bindgen export
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
    pub last_visit_time: f64, // Chrome timestamp (milliseconds since epoch)
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

// Helper function to safely deserialize history entries from JavaScript
// Uses the simpler HistoryEntryInput struct to avoid wasm_bindgen conflicts
fn deserialize_entries(entries: JsValue) -> Result<Vec<HistoryEntry>, String> {
    let inputs: Vec<HistoryEntryInput> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| format!("Failed to deserialize entries: {}", e))?;
    
    Ok(inputs.into_iter().map(|i| i.into_history_entry()).collect())
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
    // Setup panic hook for better error messages in the browser console
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    // Setup console logging (optional but helpful for debugging)
    #[cfg(debug_assertions)]
    {
        // In debug mode, we could initialize console logging here
    }
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
    let entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

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
    let entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

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
    let mut entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

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
    let entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

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
    let entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

    let limited: Vec<HistoryEntry> = entries.into_iter().take(max_count).collect();

    serde_wasm_bindgen::to_value(&limited)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

#[wasm_bindgen]
pub fn format_history_for_llm(entries: JsValue, max_chars: usize) -> Result<String, JsValue> {
    let entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

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
    let entries = deserialize_entries(entries)
        .map_err(|e| JsValue::from_str(&e))?;

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

// Internal helper: sort entries by relevance (visit count, then recency)
fn sort_entries_by_relevance_internal(mut entries: Vec<HistoryEntry>) -> Vec<HistoryEntry> {
    entries.sort_by(|a, b| {
        b.visit_count
            .cmp(&a.visit_count)
            .then_with(|| b.last_visit_time.partial_cmp(&a.last_visit_time).unwrap_or(std::cmp::Ordering::Equal))
    });
    entries
}

// Internal helper: sort entries by relevance with keywords
fn sort_entries_by_relevance_with_keywords_internal(
    entries: Vec<HistoryEntry>,
    keywords: &[String],
    current_time: f64,
) -> Vec<HistoryEntry> {
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
    scored_entries
        .into_iter()
        .map(|(entry, _)| entry)
        .collect()
}

// Combined query function: filter, score, and sort
// OPTIMIZED: Avoids unnecessary serializations/deserializations to prevent memory issues
#[wasm_bindgen]
pub fn find_relevant_history(
    entries: JsValue,
    query: &str,
    max_results: usize,
    current_time: f64,
) -> Result<JsValue, JsValue> {
    // Add safety check for query string length
    if query.len() > 1000 {
        return Err(JsValue::from_str("Query string too long (max 1000 characters)"));
    }
    
    // Use safe deserialization helper to avoid wasm_bindgen/serde conflicts
    let mut entries: Vec<HistoryEntry> = match deserialize_entries(entries) {
        Ok(parsed) => parsed,
        Err(e) => {
            return Err(JsValue::from_str(&format!(
                "{}. Ensure entries have: url (string), title (string), visit_count (integer), last_visit_time (number).",
                e
            )));
        }
    };
    
    // Validate entries before processing to catch data issues early
    // Filter out any invalid entries that might cause memory access issues
    entries.retain(|entry| {
        // Ensure all required fields are valid
        !entry.url.is_empty() 
            && entry.last_visit_time > 0.0 
            && entry.last_visit_time.is_finite()
            && entry.url.len() < 10000 // Reasonable URL length limit
            && entry.title.len() < 10000 // Reasonable title length limit
    });
    
    // Safety check: reject if we have too many entries (should be filtered by JS first)
    // Reduced limit to match conservative JavaScript limits
    const MAX_ENTRIES: usize = 2000;
    if entries.len() > MAX_ENTRIES {
        // Limit entries to prevent memory issues (take most recent)
        entries.sort_by(|a, b| {
            b.last_visit_time.partial_cmp(&a.last_visit_time)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        entries.truncate(MAX_ENTRIES);
        // Continue processing with limited entries rather than failing
    }
    
    // If we have no valid entries after validation, return empty result
    if entries.is_empty() {
        return Ok(serde_wasm_bindgen::to_value(&Vec::<HistoryEntry>::new())
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize empty result: {}", e)))?);
    }

    // Extract keywords from query
    let keywords = extract_keywords(query);

    let result: Vec<HistoryEntry> = if keywords.is_empty() {
        // No keywords, just sort by recency and visit count
        // Use internal function to avoid serialization
        let sorted = sort_entries_by_relevance_internal(entries);
        // Limit results
        sorted.into_iter().take(max_results).collect()
    } else {
        // Filter entries that match keywords
        // Note: Filtering first before scoring reduces memory usage
        let filtered: Vec<HistoryEntry> = entries
            .into_iter()
            .filter(|entry| {
                // Validate entry data to prevent memory access issues
                if entry.url.is_empty() || entry.last_visit_time <= 0.0 {
                    return false;
                }
                
                let url_lower = entry.url.to_lowercase();
                let title_lower = entry.title.to_lowercase();
                keywords.iter().any(|keyword| {
                    url_lower.contains(keyword) || title_lower.contains(keyword)
                })
            })
            .collect();

        // If filtering resulted in too many results, limit before scoring for memory safety
        let filtered_for_scoring = if filtered.len() > 10000 {
            // Sort by recency first and take top 10000
            let mut temp = filtered;
            temp.sort_by(|a, b| {
                b.last_visit_time.partial_cmp(&a.last_visit_time).unwrap_or(std::cmp::Ordering::Equal)
            });
            temp.into_iter().take(10000).collect()
        } else {
            filtered
        };

        // Score and sort using internal function to avoid serialization
        let sorted = sort_entries_by_relevance_with_keywords_internal(
            filtered_for_scoring,
            &keywords,
            current_time,
        );
        
        // Limit results
        sorted.into_iter().take(max_results).collect()
    };

    // Only serialize once at the end
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
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
