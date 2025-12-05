import 'dart:convert';
import 'package:http/http.dart' as http;

class OpenAIService {
  static const String apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  static const String defaultModel = 'gpt-4o-mini';

  final String apiKey;

  OpenAIService(this.apiKey);

  Future<String> sendChatMessage({
    required String userMessage,
    required String historyContext,
    String? systemPrompt,
  }) async {
    final prompt = systemPrompt ?? _buildDefaultSystemPrompt(historyContext);

    final response = await http.post(
      Uri.parse(apiEndpoint),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
      },
      body: jsonEncode({
        'model': defaultModel,
        'messages': [
          {'role': 'system', 'content': prompt},
          {'role': 'user', 'content': userMessage},
        ],
        'temperature': 0.7,
        'max_tokens': 1000,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['choices'][0]['message']['content'];
    } else if (response.statusCode == 401) {
      throw Exception('Invalid API key. Please check your OpenAI API key.');
    } else if (response.statusCode == 429) {
      throw Exception('Rate limit exceeded. Please try again later.');
    } else {
      throw Exception('OpenAI API error: ${response.statusCode} - ${response.body}');
    }
  }

  String _buildDefaultSystemPrompt(String historyContext) {
    return '''You are a helpful assistant that helps users understand and explore their browser history.

Here is the user's relevant browsing history:

$historyContext

Please answer the user's question based on this browsing history. Be concise and helpful. If the history doesn't contain relevant information, let the user know.''';
  }

  static bool validateApiKey(String? apiKey) {
    if (apiKey == null || apiKey.isEmpty) {
      return false;
    }
    // OpenAI API keys typically start with 'sk-'
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }
}
