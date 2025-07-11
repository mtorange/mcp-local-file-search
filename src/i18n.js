const fs = require('fs-extra');
const path = require('path');

class I18n {
  constructor() {
    this.currentLocale = this.detectLocale();
    this.messages = this.loadMessages();
  }

  // 언어 환경 자동 감지
  detectLocale() {
    // 1. 사용자 정의 환경 변수 (최우선)
    if (process.env.MCP_LANG) {
      return this.normalizeLocale(process.env.MCP_LANG);
    }

    // 2. 시스템 환경 변수들
    const envVars = [
      'LANGUAGE',     // 언어 우선순위
      'LC_ALL',       // 모든 로케일
      'LC_MESSAGES',  // 메시지 언어
      'LANG'          // 시스템 언어
    ];

    for (const envVar of envVars) {
      if (process.env[envVar]) {
        return this.normalizeLocale(process.env[envVar]);
      }
    }

    // 3. Node.js 내장 API
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (locale) {
        return this.normalizeLocale(locale);
      }
    } catch (error) {
      // Intl API 사용 불가 시 무시
    }

    // 4. 기본값 (영어)
    return 'en';
  }

  // 로케일 정규화 (ko_KR.UTF-8 -> ko, en_US -> en)
  normalizeLocale(locale) {
    if (!locale) return 'en';
    
    const normalized = locale.toLowerCase().split(/[_\-.]/)[0];
    
    // 지원하는 언어 목록
    const supportedLanguages = ['ko', 'en', 'ja', 'zh'];
    
    if (supportedLanguages.includes(normalized)) {
      return normalized;
    }
    
    // 지원하지 않는 언어는 영어로 기본값
    return 'en';
  }

  // 메시지 로드
  loadMessages() {
    return {
      ko: {
        // 일반 메시지
        'indexing.start': '인덱스가 없어 자동 인덱싱을 시작합니다...',
        'indexing.complete': '인덱싱이 완료되었습니다.',
        'indexing.reindex': '파일을 다시 인덱싱합니다...',
        'indexing.force': '강제 재인덱싱을 시작합니다...',
        
        // 검색 관련
        'search.start': '검색을 시작합니다...',
        'search.complete': '검색이 완료되었습니다.',
        'search.no_results': '검색 결과가 없습니다.',
        'search.results': '검색 결과 ({count}개):',
        'search.in_file': '파일에서 검색 중: {file}',
        
        // 오류 메시지
        'error.index_not_found': '인덱스 파일을 찾을 수 없습니다.',
        'error.file_not_found': '파일을 찾을 수 없습니다: {file}',
        'error.parse_failed': '파일 파싱에 실패했습니다: {file}',
        'error.mcp_server': 'MCP 서버 시작 중 오류가 발생했습니다.',
        'error.uncaught_exception': '처리되지 않은 예외가 발생했습니다.',
        'error.unhandled_rejection': '처리되지 않은 Promise 거부가 발생했습니다.',
        
        // MCP 도구 설명
        'tool.search_local.description': '로컬 파일에서 텍스트를 검색합니다.',
        'tool.search_local.query': '검색할 텍스트',
        'tool.search_local.limit': '검색 결과 최대 개수 (기본값: 10)',
        
        'tool.search_in_file.description': '특정 파일에서 텍스트를 검색합니다.',
        'tool.search_in_file.file_path': '검색할 파일 경로',
        'tool.search_in_file.query': '검색할 텍스트',
        
        'tool.get_index_stats.description': '인덱스 통계를 조회합니다.',
        'tool.find_similar_files.description': '특정 파일과 유사한 파일들을 찾습니다.',
        'tool.find_similar_files.file_path': '기준 파일 경로',
        'tool.find_similar_files.limit': '결과 최대 개수 (기본값: 5)',
        
        'tool.reindex.description': '파일을 다시 인덱싱합니다.',
        'tool.reindex.force': '강제 재인덱싱 여부 (기본값: false)',
        
        // 상태 메시지
        'status.initializing': '초기화 중...',
        'status.ready': '준비 완료',
        'status.processing': '처리 중...',
        'status.indexing': '인덱싱 중...',
        'status.searching': '검색 중...'
      },
      
      en: {
        // General messages
        'indexing.start': 'Starting automatic indexing as no index exists...',
        'indexing.complete': 'Indexing completed.',
        'indexing.reindex': 'Reindexing files...',
        'indexing.force': 'Starting forced reindexing...',
        
        // Search related
        'search.start': 'Starting search...',
        'search.complete': 'Search completed.',
        'search.no_results': 'No search results found.',
        'search.results': 'Search results ({count} items):',
        'search.in_file': 'Searching in file: {file}',
        
        // Error messages
        'error.index_not_found': 'Index file not found.',
        'error.file_not_found': 'File not found: {file}',
        'error.parse_failed': 'Failed to parse file: {file}',
        'error.mcp_server': 'Error occurred while starting MCP server.',
        'error.uncaught_exception': 'Uncaught exception occurred.',
        'error.unhandled_rejection': 'Unhandled promise rejection occurred.',
        
        // MCP tool descriptions
        'tool.search_local.description': 'Search for text in local files.',
        'tool.search_local.query': 'Text to search for',
        'tool.search_local.limit': 'Maximum number of search results (default: 10)',
        
        'tool.search_in_file.description': 'Search for text in a specific file.',
        'tool.search_in_file.file_path': 'File path to search in',
        'tool.search_in_file.query': 'Text to search for',
        
        'tool.get_index_stats.description': 'Get index statistics.',
        'tool.find_similar_files.description': 'Find files similar to a specific file.',
        'tool.find_similar_files.file_path': 'Reference file path',
        'tool.find_similar_files.limit': 'Maximum number of results (default: 5)',
        
        'tool.reindex.description': 'Reindex files.',
        'tool.reindex.force': 'Force reindexing (default: false)',
        
        // Status messages
        'status.initializing': 'Initializing...',
        'status.ready': 'Ready',
        'status.processing': 'Processing...',
        'status.indexing': 'Indexing...',
        'status.searching': 'Searching...'
      }
    };
  }

  // 메시지 번역
  t(key, params = {}) {
    const messages = this.messages[this.currentLocale] || this.messages.en;
    let message = messages[key];
    
    if (!message) {
      // 키가 없으면 영어 메시지 시도
      message = this.messages.en[key];
    }
    
    if (!message) {
      // 영어 메시지도 없으면 키 자체 반환
      return key;
    }
    
    // 파라미터 치환
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`{${param}}`, 'g'), value);
    }
    
    return message;
  }

  // 현재 로케일 가져오기
  getLocale() {
    return this.currentLocale;
  }

  // 로케일 설정
  setLocale(locale) {
    this.currentLocale = this.normalizeLocale(locale);
  }

  // 언어 감지 정보 반환 (디버깅용)
  getLocaleInfo() {
    return {
      detected: this.currentLocale,
      env: {
        MCP_LANG: process.env.MCP_LANG,
        LANGUAGE: process.env.LANGUAGE,
        LC_ALL: process.env.LC_ALL,
        LC_MESSAGES: process.env.LC_MESSAGES,
        LANG: process.env.LANG
      },
      intl: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().locale;
        } catch {
          return 'unavailable';
        }
      })()
    };
  }
}

// 싱글톤 인스턴스 생성
const i18n = new I18n();

module.exports = i18n; 