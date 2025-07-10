#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const MCPServer = require('./mcp-server');
const Indexer = require('./indexer');
const Searcher = require('./searcher');

// 전역 옵션
let targetDir = process.cwd();
let debugFile = null;
let forceReindex = false;

program
  .name('local-file')
  .description('Local file indexing and search MCP server')
  .version('1.0.0')
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
async function ensureIndexExists(targetDir, debugFile, forceReindex = false) {
  const indexPath = path.join(targetDir, '.local-file-index.json');
  
  if (forceReindex || !await fs.pathExists(indexPath)) {
    console.log('인덱스가 없어 자동 인덱싱을 시작합니다...');
    const indexer = new Indexer(targetDir, debugFile);
    await indexer.index(forceReindex);
    console.log('인덱싱이 완료되었습니다.');
  }
}

// MCP 모드 명령어
program
  .command('mcp')
  .description('run in MCP mode')
  .action(async () => {
    try {
      // 자동 인덱싱 확인
      await ensureIndexExists(targetDir, debugFile, forceReindex);
      
      const server = new MCPServer(targetDir, debugFile);
      await server.start();
    } catch (error) {
      console.error('MCP 서버 시작 중 오류:', error);
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
      // 자동 인덱싱 확인
      await ensureIndexExists(targetDir, debugFile, forceReindex);
      
      const searcher = new Searcher(targetDir, debugFile);
      const results = await searcher.search(text);
      
      if (results.length === 0) {
        console.log('검색 결과가 없습니다.');
        return;
      }
      
      console.log(`검색 결과 (${results.length}개):`);
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.file}`);
        console.log(`점수: ${result.score.toFixed(4)}`);
        console.log(`내용: ${result.content.substring(0, 200)}...`);
      });
    } catch (error) {
      console.error('검색 중 오류:', error);
      process.exit(1);
    }
  });

// 인덱싱 명령어
program
  .command('index')
  .description('index files in target directory')
  .action(async () => {
    try {
      const indexer = new Indexer(targetDir, debugFile);
      await indexer.index(forceReindex);
      console.log('인덱싱이 완료되었습니다.');
    } catch (error) {
      console.error('인덱싱 중 오류:', error);
      process.exit(1);
    }
  });

// 도움말 처리
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ local-file mcp --dir=/path/to/file');
  console.log('  $ local-file search "검색할 텍스트" --dir=/path/to/file');
  console.log('  $ local-file index --dir=/path/to/file --force');
});

// 명령어 파싱 및 실행
program.parse(process.argv);

// 명령어가 없으면 도움말 표시
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 