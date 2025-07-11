#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const MCPServer = require('./mcp-server');
const Indexer = require('./indexer');
const Searcher = require('./searcher');
const i18n = require('./i18n');
const packageJson = require('../package.json');

// 전역 옵션
let targetDir = process.cwd();
let debugFile = null;
let forceReindex = false;

// Console 출력 제어 함수들
let originalConsole = {};

function suppressConsoleOutput() {
  // 원래 console 함수들 백업
  originalConsole.log = console.log;
  originalConsole.error = console.error;
  originalConsole.warn = console.warn;
  originalConsole.info = console.info;
  originalConsole.debug = console.debug;
  
  // console 함수들을 빈 함수로 오버라이드
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

function restoreConsoleOutput() {
  // 원래 console 함수들 복원
  if (originalConsole.log) {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  }
}

// 디버그 로그 함수 (MCP 모드에서도 사용 가능)
function writeDebugLog(message) {
  if (debugFile) {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(debugFile, logMessage);
    } catch (error) {
      // 디버그 로그 쓰기 실패 시 무시 (MCP 모드에서는 stderr로도 출력하지 않음)
    }
  }
}

// 언어 정보 로그 (디버그용)
function logLanguageInfo() {
  const info = i18n.getLocaleInfo();
  writeDebugLog(`Language detection info: ${JSON.stringify(info, null, 2)}`);
}

program
  .name('local-file')
  .description('Local file indexing and search MCP server')
  .version(packageJson.version)
  .option('--dir <directory>', 'target directory to index', (value) => {
    targetDir = path.resolve(value);
  })
  .option('--debug-log <file>', 'debug log file', (value) => {
    debugFile = path.resolve(value);
  })
  .option('--force', 'force reindexing even if files unchanged', () => {
    forceReindex = true;
  })
  .option('--help', 'show help');

// 인덱스 확인 및 자동 인덱싱 함수
async function ensureIndexExists(targetDir, debugFile, forceReindex = false, isMCPMode = false) {
  const indexPath = path.join(targetDir, '.local-file-index.json');
  
  if (forceReindex || !await fs.pathExists(indexPath)) {
    const startMessage = forceReindex ? i18n.t('indexing.force') : i18n.t('indexing.start');
    
    // MCP 모드가 아닐 때만 콘솔 출력
    if (!isMCPMode) {
      console.log(startMessage);
    } else {
      writeDebugLog(startMessage);
    }
    
    const indexer = new Indexer(targetDir, debugFile);
    await indexer.index(forceReindex);
    
    const completeMessage = i18n.t('indexing.complete');
    // MCP 모드가 아닐 때만 콘솔 출력
    if (!isMCPMode) {
      console.log(completeMessage);
    } else {
      writeDebugLog(completeMessage);
    }
  }
}

// MCP 모드 명령어
program
  .command('mcp')
  .description('run in MCP mode')
  .action(async () => {
    try {
      // MCP 모드에서는 모든 console 출력 차단
      suppressConsoleOutput();
      
      // 외부 모듈들의 verbose 로그 억제
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = '';
      process.env.VERBOSE = '';
      process.env.SILENT = 'true';
      process.env.QUIET = 'true';
      
      writeDebugLog('MCP 모드 시작 - console 출력 차단됨, 환경 변수 설정됨');
      logLanguageInfo();
      
      // 프로세스 종료 시 console 복원 (개발 모드에서 유용)
      process.on('SIGINT', () => {
        writeDebugLog('SIGINT 수신 - 프로세스 종료');
        restoreConsoleOutput();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        writeDebugLog('SIGTERM 수신 - 프로세스 종료');
        restoreConsoleOutput();
        process.exit(0);
      });
      
      // 예외 처리 (외부 모듈의 에러를 디버그 로그로 기록)
      process.on('uncaughtException', (error) => {
        const errorMessage = `${i18n.t('error.uncaught_exception')}: ${error.message}\n${error.stack}`;
        writeDebugLog(errorMessage);
        // --debug-log 옵션이 있으면 stderr 출력 최소화
        if (debugFile) {
          process.stderr.write(`${i18n.t('error.uncaught_exception')} logged to debug file\n`);
        } else {
          process.stderr.write(`${i18n.t('error.uncaught_exception')}: ${error.message}\n`);
        }
        process.exit(1);
      });
      
      process.on('unhandledRejection', (reason, promise) => {
        const errorMessage = `${i18n.t('error.unhandled_rejection')}: ${promise}, reason: ${reason}`;
        writeDebugLog(errorMessage);
        // --debug-log 옵션이 있으면 stderr 출력 최소화
        if (debugFile) {
          process.stderr.write(`${i18n.t('error.unhandled_rejection')} logged to debug file\n`);
        } else {
          process.stderr.write(`${i18n.t('error.unhandled_rejection')}: ${reason}\n`);
        }
        process.exit(1);
      });
      
      // 자동 인덱싱 확인 (MCP 모드이므로 조용히 실행)
      await ensureIndexExists(targetDir, debugFile, forceReindex, true);
      
      const server = new MCPServer(targetDir, debugFile);
      await server.start();
    } catch (error) {
      // MCP 모드에서는 모든 오류를 디버그 로그로 기록
      const errorMessage = `${i18n.t('error.mcp_server')}: ${error.message}\n스택: ${error.stack}`;
      writeDebugLog(errorMessage);
      
      // --debug-log 옵션이 있으면 stderr 출력 최소화
      if (debugFile) {
        process.stderr.write(`${i18n.t('error.mcp_server')} - 자세한 내용은 디버그 로그 참조\n`);
      } else {
        process.stderr.write(`${i18n.t('error.mcp_server')}: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

// 검색 명령어
program
  .command('search')
  .description('search for text in indexed files')
  .argument('<text>', 'text to search for')
  .action(async (text) => {
    try {
      writeDebugLog(`검색 명령어 시작: "${text}"`);
      writeDebugLog(`대상 디렉토리: ${targetDir}`);
      writeDebugLog(`디버그 로그 파일: ${debugFile || 'None'}`);
      writeDebugLog(`강제 재인덱싱: ${forceReindex}`);
      
      // 자동 인덱싱 확인 (검색 모드이므로 일반 출력)
      await ensureIndexExists(targetDir, debugFile, forceReindex, false);
      
      writeDebugLog('검색 시작...');
      const searcher = new Searcher(targetDir, debugFile);
      const results = await searcher.search(text);
      
      writeDebugLog(`검색 완료: ${results.length}개 결과 발견`);
      
      if (results.length === 0) {
        console.log(i18n.t('search.no_results'));
        writeDebugLog(i18n.t('search.no_results'));
        return;
      }
      
      console.log(i18n.t('search.results', { count: results.length }));
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.file}`);
        console.log(`점수: ${result.score.toFixed(4)}`);
        console.log(`내용: ${result.content.substring(0, 200)}...`);
        writeDebugLog(`결과 ${index + 1}: ${result.file}, 점수: ${result.score.toFixed(4)}`);
      });
      
      writeDebugLog(i18n.t('search.complete'));
    } catch (error) {
      const errorMessage = `검색 중 오류: ${error.message}`;
      console.error(errorMessage);
      writeDebugLog(`${errorMessage}\n스택: ${error.stack}`);
      process.exit(1);
    }
  });

// 인덱싱 명령어
program
  .command('index')
  .description('index files in target directory')
  .action(async () => {
    try {
      writeDebugLog('인덱싱 명령어 시작');
      writeDebugLog(`대상 디렉토리: ${targetDir}`);
      writeDebugLog(`디버그 로그 파일: ${debugFile || 'None'}`);
      writeDebugLog(`강제 재인덱싱: ${forceReindex}`);
      
      const indexer = new Indexer(targetDir, debugFile);
      await indexer.index(forceReindex);
      
      console.log(i18n.t('indexing.complete'));
      writeDebugLog(i18n.t('indexing.complete'));
    } catch (error) {
      const errorMessage = `인덱싱 중 오류: ${error.message}`;
      console.error(errorMessage);
      writeDebugLog(`${errorMessage}\n스택: ${error.stack}`);
      process.exit(1);
    }
  });

// 언어 정보 명령어
program
  .command('lang-info')
  .description('show language detection information')
  .action(() => {
    const info = i18n.getLocaleInfo();
    console.log('Language Detection Information:');
    console.log('============================');
    console.log(`Current Locale: ${info.detected}`);
    console.log(`Environment Variables:`);
    console.log(`  MCP_LANG: ${info.env.MCP_LANG || 'not set'}`);
    console.log(`  LANGUAGE: ${info.env.LANGUAGE || 'not set'}`);
    console.log(`  LC_ALL: ${info.env.LC_ALL || 'not set'}`);
    console.log(`  LC_MESSAGES: ${info.env.LC_MESSAGES || 'not set'}`);
    console.log(`  LANG: ${info.env.LANG || 'not set'}`);
    console.log(`Node.js Intl API: ${info.intl}`);
    console.log('');
    console.log('Test Messages:');
    console.log(`  ${i18n.t('indexing.start')}`);
    console.log(`  ${i18n.t('search.no_results')}`);
    console.log(`  ${i18n.t('error.mcp_server')}`);
  });

// 도움말 처리
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ local-file mcp --dir=/path/to/file');
  console.log('  $ local-file search "검색할 텍스트" --dir=/path/to/file');
  console.log('  $ local-file index --dir=/path/to/file --force');
  console.log('  $ local-file lang-info');
});

// 명령어 파싱 및 실행
program.parse(process.argv);

// 명령어가 없으면 도움말 표시
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 