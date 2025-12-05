@JS()
library chrome_storage;

import 'package:js/js.dart';

/// Wrapper for Chrome Storage API
@JS('chrome.storage.local.get')
external dynamic chromeStorageLocalGet(dynamic keys, Function callback);

@JS('chrome.storage.local.set')
external dynamic chromeStorageLocalSet(dynamic items, Function? callback);

@JS('chrome.storage.local.remove')
external dynamic chromeStorageLocalRemove(dynamic keys, Function? callback);

@JS('chrome.storage.local.clear')
external dynamic chromeStorageLocalClear(Function? callback);

class ChromeStorageService {
  static const String apiKeyStorageKey = 'openai_api_key';
  static const String preferencesStorageKey = 'user_preferences';
  static const String chatHistoryStorageKey = 'chat_history';

  Future<String?> getApiKey() async {
    // Implementation will use chromeStorageLocalGet
    throw UnimplementedError('To be implemented');
  }

  Future<void> saveApiKey(String apiKey) async {
    // Implementation will use chromeStorageLocalSet
    throw UnimplementedError('To be implemented');
  }

  Future<void> clearApiKey() async {
    // Implementation will use chromeStorageLocalRemove
    throw UnimplementedError('To be implemented');
  }

  Future<Map<String, dynamic>?> getPreferences() async {
    throw UnimplementedError('To be implemented');
  }

  Future<void> savePreferences(Map<String, dynamic> preferences) async {
    throw UnimplementedError('To be implemented');
  }
}
