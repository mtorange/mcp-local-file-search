const fs = require('fs-extra');
const path = require('path');
const natural = require('natural');

class Searcher {
  constructor(targetDir, debugFile = null) {
    this.targetDir = targetDir;
    this.debugFile = debugFile;
    this.indexPath = path.join(targetDir, '.local-file-index.json');
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // BM25 파라미터
    this.k1 = 1.2;
    this.b = 0.75;
  }

  // 디버그 로그 출력
  debug(message) {
    if (this.debugFile) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.debugFile, logMessage);
    }
  }

  // 인덱스 로드
  async loadIndex() {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const indexData = await fs.readJson(this.indexPath);
        return indexData;
      } else {
        throw new Error('인덱스 파일이 존재하지 않습니다. 먼저 인덱싱을 실행해주세요.');
      }
    } catch (error) {
      this.debug(`인덱스 로드 오류: ${error.message}`);
      throw error;
    }
  }

  // 개선된 쿼리 토큰화 (한국어 + 영어 지원)
  tokenizeQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // 한국어와 영어 모두 처리하기 위한 토큰 배열
    let tokens = [];
    
    // 영어 단어 토큰화
    const englishTokens = this.tokenizer.tokenize(normalizedQuery);
    if (englishTokens) {
      tokens = tokens.concat(englishTokens);
    }
    
    // 한국어 토큰화 (공백 기준 + 2자 이상 한글 추출)
    const koreanTokens = normalizedQuery.match(/[가-힣]{2,}/g) || [];
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
    
    // 중복 제거
    return [...new Set(finalTokens)];
  }

  // 평균 문서 길이 계산
  calculateAverageDocumentLength(indexData) {
    const files = Object.values(indexData.files);
    const totalLength = files.reduce((sum, file) => sum + file.termCount, 0);
    return totalLength / files.length;
  }

  // BM25 점수 계산
  calculateBM25Score(queryTerms, fileData, termStats, avgDocLength, totalDocs) {
    let score = 0;
    
    queryTerms.forEach(term => {
      const termFreq = fileData.termFreq[term] || 0;
      const docLength = fileData.termCount;
      const termStat = termStats[term];
      
      if (termFreq > 0 && termStat) {
        const idf = termStat.idf;
        const tf = termFreq / (termFreq + this.k1 * (1 - this.b + this.b * (docLength / avgDocLength)));
        score += idf * tf;
      }
    });
    
    return score;
  }

  // 검색 결과 하이라이트
  highlightMatches(content, queryTerms, maxLength = 500) {
    let highlightedContent = content;
    
    // 쿼리 용어들을 하이라이트
    queryTerms.forEach(term => {
      // 한국어와 영어 모두 처리
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedContent = highlightedContent.replace(regex, `**$1**`);
    });
    
    // 최대 길이로 자르기
    if (highlightedContent.length > maxLength) {
      const firstMatch = highlightedContent.indexOf('**');
      if (firstMatch !== -1) {
        const start = Math.max(0, firstMatch - 100);
        const end = Math.min(highlightedContent.length, start + maxLength);
        highlightedContent = '...' + highlightedContent.substring(start, end) + '...';
      } else {
        highlightedContent = highlightedContent.substring(0, maxLength) + '...';
      }
    }
    
    return highlightedContent;
  }

  // 검색 실행
  async search(query, limit = 10) {
    try {
      this.debug(`검색 시작: "${query}"`);
      
      // 인덱스 로드
      const indexData = await this.loadIndex();
      
      if (Object.keys(indexData.files).length === 0) {
        this.debug('인덱싱된 파일이 없습니다.');
        return [];
      }
      
      // 쿼리 토큰화
      const queryTerms = this.tokenizeQuery(query);
      if (queryTerms.length === 0) {
        this.debug('유효한 검색어가 없습니다.');
        return [];
      }
      
      this.debug(`검색 용어: ${queryTerms.join(', ')}`);
      
      // 평균 문서 길이 계산
      const avgDocLength = this.calculateAverageDocumentLength(indexData);
      const totalDocs = indexData.stats.totalDocuments;
      
      // 각 파일에 대해 BM25 점수 계산
      const results = [];
      
      Object.values(indexData.files).forEach(fileData => {
        const score = this.calculateBM25Score(
          queryTerms,
          fileData,
          indexData.terms,
          avgDocLength,
          totalDocs
        );
        
        // 점수가 0보다 큰 경우만 결과에 포함
        if (score > 0) {
          const highlightedContent = this.highlightMatches(fileData.content, queryTerms);
          
          results.push({
            file: fileData.file,
            score: score,
            content: highlightedContent,
            extension: fileData.extension,
            size: fileData.size,
            mtime: fileData.mtime
          });
        }
      });
      
      // 점수 순으로 정렬
      results.sort((a, b) => b.score - a.score);
      
      // 결과 제한
      const limitedResults = results.slice(0, limit);
      
      this.debug(`검색 완료: ${limitedResults.length}개 결과`);
      
      return limitedResults;
    } catch (error) {
      this.debug(`검색 오류: ${error.message}`);
      throw error;
    }
  }

  // 파일별 검색 (특정 파일에서만 검색)
  async searchInFile(filePath, query) {
    try {
      const indexData = await this.loadIndex();
      const fileData = indexData.files[filePath];
      
      if (!fileData) {
        throw new Error(`파일이 인덱스에 없습니다: ${filePath}`);
      }
      
      const queryTerms = this.tokenizeQuery(query);
      const avgDocLength = this.calculateAverageDocumentLength(indexData);
      const totalDocs = indexData.stats.totalDocuments;
      
      const score = this.calculateBM25Score(
        queryTerms,
        fileData,
        indexData.terms,
        avgDocLength,
        totalDocs
      );
      
      if (score > 0) {
        const highlightedContent = this.highlightMatches(fileData.content, queryTerms);
        
        return {
          file: fileData.file,
          score: score,
          content: highlightedContent,
          extension: fileData.extension,
          size: fileData.size,
          mtime: fileData.mtime
        };
      }
      
      return null;
    } catch (error) {
      this.debug(`파일 검색 오류: ${error.message}`);
      throw error;
    }
  }

  // 인덱스 통계 조회
  async getIndexStats() {
    try {
      const indexData = await this.loadIndex();
      
      return {
        totalFiles: Object.keys(indexData.files).length,
        totalTerms: Object.keys(indexData.terms).length,
        indexSize: JSON.stringify(indexData).length,
        lastUpdated: indexData.stats.lastUpdated || 'Unknown'
      };
    } catch (error) {
      this.debug(`통계 조회 오류: ${error.message}`);
      throw error;
    }
  }

  // 유사한 파일 찾기
  async findSimilarFiles(filePath, limit = 5) {
    try {
      const indexData = await this.loadIndex();
      const targetFile = indexData.files[filePath];
      
      if (!targetFile) {
        throw new Error(`파일이 인덱스에 없습니다: ${filePath}`);
      }
      
      // 대상 파일의 상위 용어들 추출
      const termEntries = Object.entries(targetFile.termFreq);
      termEntries.sort((a, b) => b[1] - a[1]);
      const topTerms = termEntries.slice(0, 10).map(entry => entry[0]);
      
      // 다른 파일들과 유사도 계산
      const similarities = [];
      
      Object.values(indexData.files).forEach(fileData => {
        if (fileData.file !== filePath) {
          const avgDocLength = this.calculateAverageDocumentLength(indexData);
          const totalDocs = indexData.stats.totalDocuments;
          
          const score = this.calculateBM25Score(
            topTerms,
            fileData,
            indexData.terms,
            avgDocLength,
            totalDocs
          );
          
          if (score > 0) {
            similarities.push({
              file: fileData.file,
              score: score,
              extension: fileData.extension,
              size: fileData.size
            });
          }
        }
      });
      
      similarities.sort((a, b) => b.score - a.score);
      return similarities.slice(0, limit);
    } catch (error) {
      this.debug(`유사 파일 검색 오류: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Searcher; 