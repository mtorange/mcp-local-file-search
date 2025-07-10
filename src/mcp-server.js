const fs = require('fs-extra');
const path = require('path');
const Searcher = require('./searcher');
const Indexer = require('./indexer');

class MCPServer {
  constructor(targetDir, debugFile = null) {
    this.targetDir = targetDir;
    this.debugFile = debugFile;
    this.searcher = new Searcher(targetDir, debugFile);
    this.indexer = new Indexer(targetDir, debugFile);
    
    // MCP 프로토콜 상태
    this.requestId = 0;
    this.isRunning = false;
    this.initialized = false;
    this.clientInitialized = false; // 클라이언트 초기화 상태 추가
  }

  // 디버그 로그 출력
  debug(message) {
    if (this.debugFile) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.debugFile, logMessage);
    }
  }

  // JSON-RPC 메시지 파싱
  parseMessage(line) {
    try {
      const message = JSON.parse(line);
      this.debug(`메시지 파싱 성공: ${JSON.stringify(message)}`);
      return message;
    } catch (error) {
      this.debug(`메시지 파싱 오류: ${error.message}, 입력: ${line}`);
      return null;
    }
  }

  // JSON-RPC 응답 전송
  sendResponse(id, result = null, error = null) {
    // id가 null 또는 undefined인 경우 처리
    if (id === null || id === undefined) {
      this.debug('경고: 응답 ID가 null 또는 undefined입니다.');
      return;
    }
    
    const response = {
      jsonrpc: '2.0',
      id: id
    };
    
    if (error) {
      response.error = {
        code: error.code || -32000,
        message: error.message || String(error)
      };
    } else {
      response.result = result || {};
    }
    
    const responseStr = JSON.stringify(response);
    this.debug(`응답 전송: ${responseStr}`);
    process.stdout.write(responseStr + '\n');
  }

  // 알림 전송
  sendNotification(method, params = null) {
    const notification = {
      jsonrpc: '2.0',
      method: method
    };
    
    if (params !== null) {
      notification.params = params;
    }
    
    const notificationStr = JSON.stringify(notification);
    this.debug(`알림 전송: ${notificationStr}`);
    process.stdout.write(notificationStr + '\n');
  }

  // 초기화 처리
  async handleInitialize(params) {
    this.debug('초기화 요청 처리');
    this.initialized = true;
    
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: true
        }
      },
      serverInfo: {
        name: 'local-file',
        version: '1.0.0'
      }
    };
  }

  // notifications/initialized 처리
  async handleInitializedNotification() {
    this.debug('클라이언트 초기화 알림 수신');
    this.clientInitialized = true;
    
    // 초기 인덱싱 시작
    try {
      const indexPath = path.join(this.targetDir, '.local-file-index.json');
      if (!await fs.pathExists(indexPath)) {
        this.debug('인덱스가 없어 자동 인덱싱 시작');
        await this.indexer.index(false);
      }
    } catch (error) {
      this.debug(`초기 인덱싱 오류: ${error.message}`);
    }
  }

  // 리소스 목록 제공 (빈 리스트 반환)
  async handleListResources() {
    this.debug('리소스 목록 요청 처리 (빈 리스트 반환)');
    
    return {
      resources: []
    };
  }

  // 프롬프트 목록 제공 (빈 리스트 반환)
  async handleListPrompts() {
    this.debug('프롬프트 목록 요청 처리 (빈 리스트 반환)');
    
    return {
      prompts: []
    };
  }

  // 도구 목록 제공
  async handleListTools() {
    this.debug('도구 목록 요청 처리');
    
    return {
      tools: [
        {
          name: 'search-local',
          description: '로컬 파일에서 텍스트를 검색합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '검색할 텍스트'
              },
              limit: {
                type: 'integer',
                description: '검색 결과 최대 개수 (기본값: 10)',
                default: 10
              }
            },
            required: ['query']
          }
        },
        {
          name: 'search-in-file',
          description: '특정 파일에서 텍스트를 검색합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: '검색할 파일 경로'
              },
              query: {
                type: 'string',
                description: '검색할 텍스트'
              }
            },
            required: ['filePath', 'query']
          }
        },
        {
          name: 'get-index-stats',
          description: '인덱스 통계를 조회합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              random_string: {
                type: 'string',
                description: 'Dummy parameter for no-parameter tools'
              }
            },
            required: ['random_string']
          }
        },
        {
          name: 'find-similar-files',
          description: '특정 파일과 유사한 파일들을 찾습니다.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: '기준 파일 경로'
              },
              limit: {
                type: 'integer',
                description: '결과 최대 개수 (기본값: 5)',
                default: 5
              }
            },
            required: ['filePath']
          }
        },
        {
          name: 'reindex',
          description: '파일을 다시 인덱싱합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              force: {
                type: 'boolean',
                description: '강제 재인덱싱 여부 (기본값: false)',
                default: false
              }
            }
          }
        }
      ]
    };
  }

  // 도구 실행
  async handleCallTool(params) {
    const { name, arguments: args } = params;
    
    this.debug(`도구 실행: ${name}, 인수: ${JSON.stringify(args)}`);
    
    try {
      switch (name) {
        case 'search-local':
          return await this.handleSearchLocal(args);
        
        case 'search-in-file':
          return await this.handleSearchInFile(args);
        
        case 'get-index-stats':
          return await this.handleGetIndexStats(args);
        
        case 'find-similar-files':
          return await this.handleFindSimilarFiles(args);
        
        case 'reindex':
          return await this.handleReindex(args);
        
        default:
          throw new Error(`알 수 없는 도구: ${name}`);
      }
    } catch (error) {
      this.debug(`도구 실행 오류: ${error.message}`);
      throw error;
    }
  }

  // 로컬 검색 처리
  async handleSearchLocal(args) {
    const { query, limit = 10 } = args;
    
    if (!query) {
      throw new Error('검색어가 필요합니다.');
    }
    
    const results = await this.searcher.search(query, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `검색 결과 (${results.length}개):\n\n` +
                results.map((result, index) => 
                  `${index + 1}. **${result.file}** (점수: ${result.score.toFixed(4)})\n` +
                  `   확장자: ${result.extension}, 크기: ${result.size}바이트\n` +
                  `   수정일: ${result.mtime}\n` +
                  `   내용: ${result.content}\n`
                ).join('\n')
        }
      ]
    };
  }

  // 파일 내 검색 처리
  async handleSearchInFile(args) {
    const { filePath, query } = args;
    
    if (!filePath || !query) {
      throw new Error('파일 경로와 검색어가 필요합니다.');
    }
    
    const result = await this.searcher.searchInFile(filePath, query);
    
    if (result) {
      return {
        content: [
          {
            type: 'text',
            text: `파일 "${result.file}"에서 검색 결과:\n\n` +
                  `점수: ${result.score.toFixed(4)}\n` +
                  `확장자: ${result.extension}, 크기: ${result.size}바이트\n` +
                  `수정일: ${result.mtime}\n\n` +
                  `내용:\n${result.content}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `파일 "${filePath}"에서 검색 결과를 찾을 수 없습니다.`
          }
        ]
      };
    }
  }

  // 인덱스 통계 조회 처리
  async handleGetIndexStats(args = {}) {
    // random_string 파라미터는 무시 (더미 파라미터)
    const stats = await this.searcher.getIndexStats();
    
    return {
      content: [
        {
          type: 'text',
          text: `인덱스 통계:\n\n` +
                `총 파일 수: ${stats.totalFiles}\n` +
                `총 용어 수: ${stats.totalTerms}\n` +
                `인덱스 크기: ${(stats.indexSize / 1024).toFixed(2)}KB\n` +
                `마지막 업데이트: ${stats.lastUpdated}`
        }
      ]
    };
  }

  // 유사 파일 찾기 처리
  async handleFindSimilarFiles(args) {
    const { filePath, limit = 5 } = args;
    
    if (!filePath) {
      throw new Error('파일 경로가 필요합니다.');
    }
    
    const results = await this.searcher.findSimilarFiles(filePath, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `"${filePath}"와 유사한 파일들 (${results.length}개):\n\n` +
                results.map((result, index) => 
                  `${index + 1}. **${result.file}** (유사도: ${result.score.toFixed(4)})\n` +
                  `   확장자: ${result.extension}, 크기: ${result.size}바이트\n`
                ).join('\n')
        }
      ]
    };
  }

  // 재인덱싱 처리
  async handleReindex(args) {
    const { force = false } = args;
    
    const result = await this.indexer.index(force);
    
    return {
      content: [
        {
          type: 'text',
          text: `인덱싱 완료:\n\n` +
                `총 파일 수: ${result.totalFiles}\n` +
                `인덱싱된 파일 수: ${result.indexedFiles}\n` +
                `제거된 파일 수: ${result.removedFiles}\n` +
                `총 용어 수: ${result.totalTerms}`
        }
      ]
    };
  }

  // 요청 처리
  async handleRequest(message) {
    // 메시지 유효성 검사
    if (!message || typeof message !== 'object') {
      this.debug('유효하지 않은 메시지 형식');
      return;
    }

    const { id, method, params } = message;
    
    // 알림 메시지 처리 (id가 null 또는 undefined인 경우만)
    if ((id === null || id === undefined) && method) {
      this.debug(`알림 처리: ${method}`);
      
      if (method === 'notifications/initialized') {
        await this.handleInitializedNotification();
      } else if (method === 'notifications/cancelled') {
        this.debug(`요청 취소 알림: ${JSON.stringify(params)}`);
      } else {
        this.debug(`알 수 없는 알림: ${method}`);
      }
      return;
    }
    
    // 요청 메시지 처리 (id가 존재하는 경우)
    if (!method) {
      this.debug('method 필드가 없는 요청');
      this.sendResponse(id, null, { code: -32600, message: 'Invalid Request: method 필드가 필요합니다.' });
      return;
    }
    
    this.debug(`요청 처리: ${method}, ID: ${id}`);
    
    // initialize 요청이 아닌 경우 초기화 상태 확인
    if (method !== 'initialize' && !this.initialized) {
      this.debug('초기화되지 않은 상태에서 요청 거부');
      this.sendResponse(id, null, { code: -32002, message: '서버가 초기화되지 않았습니다. 먼저 initialize를 호출하세요.' });
      return;
    }
    
    try {
      let result;
      
      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params);
          break;
        
        case 'tools/list':
          result = await this.handleListTools();
          break;
        
        case 'tools/call':
          result = await this.handleCallTool(params);
          break;
        
        case 'resources/list':
          result = await this.handleListResources();
          break;
        
        case 'prompts/list':
          result = await this.handleListPrompts();
          break;
        
        default:
          throw new Error(`지원하지 않는 메서드: ${method}`);
      }
      
      this.sendResponse(id, result);
    } catch (error) {
      this.debug(`요청 처리 오류: ${error.message}`);
      this.sendResponse(id, null, { code: -32000, message: error.message });
    }
  }

  // 서버 시작
  async start() {
    this.debug('MCP 서버 시작');
    this.isRunning = true;
    
    // stdio 입력 처리
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      const lines = data.trim().split('\n');
      
      lines.forEach(line => {
        if (line.trim()) {
          const message = this.parseMessage(line);
          if (message) {
            this.handleRequest(message);
          }
        }
      });
    });
    
    process.stdin.on('end', () => {
      this.debug('MCP 서버 종료');
      this.isRunning = false;
    });
    
    process.on('SIGINT', () => {
      this.debug('SIGINT 수신, 서버 종료');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      this.debug('SIGTERM 수신, 서버 종료');
      process.exit(0);
    });
    
    this.debug('MCP 서버 준비 완료, 클라이언트의 initialize 요청 대기 중');
  }
}

module.exports = MCPServer; 