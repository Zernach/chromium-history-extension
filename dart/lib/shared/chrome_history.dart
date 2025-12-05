@JS()
library chrome_history;

import 'package:js/js.dart';

/// Wrapper for Chrome History API
@JS('chrome.history.search')
external dynamic chromeHistorySearch(HistoryQuery query, Function callback);

@JS('chrome.history.getVisits')
external dynamic chromeHistoryGetVisits(HistoryUrl url, Function callback);

@JS()
@anonymous
class HistoryQuery {
  external factory HistoryQuery({
    String? text,
    num? startTime,
    num? endTime,
    num? maxResults,
  });

  external String? get text;
  external num? get startTime;
  external num? get endTime;
  external num? get maxResults;
}

@JS()
@anonymous
class HistoryUrl {
  external factory HistoryUrl({String url});
  external String get url;
}

@JS()
@anonymous
class HistoryItem {
  external String get url;
  external String get title;
  external num get visitCount;
  external num get lastVisitTime;
  external String? get id;
}

class ChromeHistoryService {
  Future<List<HistoryItem>> searchHistory({
    String? text,
    num? startTime,
    num? endTime,
    num? maxResults,
  }) async {
    // Implementation will use chromeHistorySearch
    throw UnimplementedError('To be implemented');
  }
}
