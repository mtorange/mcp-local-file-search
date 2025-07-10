const fs = require('fs-extra');
const path = require('path');
const natural = require('natural');
const FileParser = require('./file-parser');

class Indexer {
  constructor(targetDir, debugFile = null) {
    this.targetDir = targetDir;
    this.debugFile = debugFile;
    this.parser = new FileParser(debugFile);
    this.indexPath = path.join(targetDir, '.local-file-index.json');
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  // 디버그 로그 출력
  debug(message) {
    if (this.debugFile) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.debugFile, logMessage);
    }
  }

  // 인덱스 파일 경로 생성
  getIndexPath() {
    return this.indexPath;
  }

  // 기존 인덱스 로드
  async loadExistingIndex() {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const indexData = await fs.readJson(this.indexPath);
        return indexData;
      }
    } catch (error) {
      this.debug(`기존 인덱스 로드 오류: ${error.message}`);
    }
    return { files: {}, terms: {}, stats: {} };
  }

  // 인덱스 저장
  async saveIndex(indexData) {
    try {
      await fs.writeJson(this.indexPath, indexData, { spaces: 2 });
      this.debug(`인덱스 저장 완료: ${this.indexPath}`);
    } catch (error) {
      this.debug(`인덱스 저장 오류: ${error.message}`);
      throw error;
    }
  }

  // 디렉토리의 모든 파일 탐색
  async findFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // 인덱스 파일은 무조건 제외
        if (entry.isFile() && entry.name === '.local-file-index.json') {
          continue;
        }
        
        if (entry.isDirectory()) {
          // 숨김 디렉토리 및 node_modules 제외
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const subFiles = await this.findFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          // 지원하는 파일만 포함
          if (this.parser.isSupported(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.debug(`디렉토리 탐색 오류: ${dir} - ${error.message}`);
    }
    
    return files;
  }

  // 개선된 텍스트 토큰화 및 정규화 (한국어 + 영어 지원)
  tokenizeText(text) {
    const normalizedText = text.toLowerCase().trim();
    
    // 한국어와 영어 모두 처리하기 위한 토큰 배열
    let tokens = [];
    
    // 영어 단어 토큰화
    const englishTokens = this.tokenizer.tokenize(normalizedText);
    if (englishTokens) {
      tokens = tokens.concat(englishTokens);
    }
    
    // 한국어 토큰화 (공백 기준 + 2자 이상 한글 추출)
    const koreanTokens = normalizedText.match(/[가-힣]{2,}/g) || [];
    tokens = tokens.concat(koreanTokens);
    
    // 특수 문자 제거 및 빈 토큰 제거
    tokens = tokens
      .map(token => token.replace(/[^\w가-힣]/g, ''))
      .filter(token => token.length > 1);
    
    // 영어 토큰에 대해서만 스테밍 적용
    const finalTokens = tokens.map(token => {
      if (/^[a-zA-Z]+$/.test(token)) {
        return this.stemmer.stem(token);
      }
      return token;
    });
    
    // 중복 제거하지 않음 (빈도 계산을 위해)
    return finalTokens;
  }

  // 문서의 용어 빈도 계산
  calculateTermFrequency(tokens) {
    const termFreq = {};
    
    tokens.forEach(token => {
      termFreq[token] = (termFreq[token] || 0) + 1;
    });
    
    return termFreq;
  }

  // BM25 점수 계산을 위한 통계 업데이트
  updateGlobalStats(indexData) {
    const { files, terms, stats } = indexData;
    
    // 문서 수
    stats.totalDocuments = Object.keys(files).length;
    
    // 각 용어의 문서 빈도 계산
    const termDocFreq = {};
    
    Object.values(files).forEach(fileData => {
      const uniqueTerms = new Set(Object.keys(fileData.termFreq));
      uniqueTerms.forEach(term => {
        termDocFreq[term] = (termDocFreq[term] || 0) + 1;
      });
    });
    
    // 용어 통계 업데이트
    Object.keys(termDocFreq).forEach(term => {
      terms[term] = {
        documentFrequency: termDocFreq[term],
        idf: Math.log((stats.totalDocuments - termDocFreq[term] + 0.5) / (termDocFreq[term] + 0.5))
      };
    });
    
    this.debug(`통계 업데이트 완료: ${stats.totalDocuments}개 문서, ${Object.keys(terms).length}개 용어`);
  }

  // 파일 인덱싱
  async indexFile(filePath, existingIndex) {
    try {
      const stats = await fs.stat(filePath);
      const existingFileData = existingIndex.files[filePath];
      
      // 파일이 변경되지 않았으면 기존 인덱스 사용
      if (existingFileData && existingFileData.mtime === stats.mtime.toISOString()) {
        this.debug(`파일 변경 없음: ${filePath}`);
        return existingFileData;
      }
      
      // 파일 파싱
      const parsedFile = await this.parser.parseFile(filePath);
      if (!parsedFile) {
        this.debug(`파일 파싱 실패: ${filePath}`);
        return null;
      }
      
      // 텍스트 토큰화
      const tokens = this.tokenizeText(parsedFile.content);
      const termFreq = this.calculateTermFrequency(tokens);
      
      const fileData = {
        file: filePath,
        content: parsedFile.content,
        extension: parsedFile.extension,
        size: parsedFile.size,
        mtime: parsedFile.mtime.toISOString(),
        termFreq: termFreq,
        termCount: tokens.length
      };
      
      this.debug(`파일 인덱싱 완료: ${filePath} (${tokens.length}개 토큰)`);
      return fileData;
    } catch (error) {
      this.debug(`파일 인덱싱 오류: ${filePath} - ${error.message}`);
      return null;
    }
  }

  // 메인 인덱싱 함수
  async index(force = false) {
    try {
      this.debug(`인덱싱 시작: ${this.targetDir} (force: ${force})`);
      
      // 기존 인덱스 로드
      let indexData = await this.loadExistingIndex();
      
      if (force) {
        this.debug('강제 인덱싱 모드');
        indexData = { files: {}, terms: {}, stats: {} };
      }
      
      // 모든 파일 탐색
      const allFiles = await this.findFiles(this.targetDir);
      this.debug(`발견된 파일: ${allFiles.length}개`);
      
      // 각 파일 인덱싱
      const newFiles = {};
      let indexedCount = 0;
      
      for (const filePath of allFiles) {
        const fileData = await this.indexFile(filePath, indexData);
        if (fileData) {
          newFiles[filePath] = fileData;
          indexedCount++;
        }
      }
      
      // 존재하지 않는 파일 제거
      const existingFiles = Object.keys(indexData.files);
      const removedFiles = existingFiles.filter(file => !allFiles.includes(file));
      
      if (removedFiles.length > 0) {
        this.debug(`제거된 파일: ${removedFiles.length}개`);
        removedFiles.forEach(file => {
          delete indexData.files[file];
        });
      }
      
      // 새로운 인덱스 데이터 설정
      indexData.files = newFiles;
      
      // 전역 통계 업데이트
      this.updateGlobalStats(indexData);
      
      // 인덱스 저장
      await this.saveIndex(indexData);
      
      this.debug(`인덱싱 완료: ${indexedCount}개 파일 처리`);
      
      return {
        totalFiles: allFiles.length,
        indexedFiles: indexedCount,
        removedFiles: removedFiles.length,
        totalTerms: Object.keys(indexData.terms).length
      };
    } catch (error) {
      this.debug(`인덱싱 오류: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Indexer; 