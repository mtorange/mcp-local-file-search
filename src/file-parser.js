const fs = require('fs-extra');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const xml2js = require('xml2js');

class FileParser {
  constructor(debugFile = null) {
    this.debugFile = debugFile;
  }

  // 디버그 로그 출력
  debug(message) {
    if (this.debugFile) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.debugFile, logMessage);
    }
  }

  // 파일 확장자 가져오기
  getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }

  // 파일 파싱
  async parseFile(filePath) {
    try {
      const ext = this.getFileExtension(filePath);
      const stats = await fs.stat(filePath);
      
      this.debug(`파일 파싱 시작: ${filePath} (${ext})`);
      
      let content = '';
      
      switch (ext) {
        case '.txt':
        case '.md':
        case '.json':
        case '.js':
        case '.ts':
        case '.html':
        case '.css':
        case '.xml':
        case '.csv':
          content = await this.parseTextFile(filePath);
          break;
        case '.doc':
        case '.docx':
          content = await this.parseWordFile(filePath);
          break;
        case '.pdf':
          content = await this.parsePdfFile(filePath);
          break;
        case '.xls':
        case '.xlsx':
          content = await this.parseExcelFile(filePath);
          break;
        case '.pptx':
          content = await this.parsePowerPointFile(filePath);
          break;
        default:
          // 지원하지 않는 파일 형식은 텍스트로 시도
          try {
            content = await this.parseTextFile(filePath);
          } catch (error) {
            this.debug(`지원하지 않는 파일 형식: ${filePath}`);
            return null;
          }
      }
      
      this.debug(`파일 파싱 완료: ${filePath} (${content.length}자)`);
      
      return {
        file: filePath,
        content: content,
        extension: ext,
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      this.debug(`파일 파싱 오류: ${filePath} - ${error.message}`);
      return null;
    }
  }

  // 텍스트 파일 파싱
  async parseTextFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  }

  // Word 파일 파싱
  async parseWordFile(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // PDF 파일 파싱
  async parsePdfFile(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await pdfParse(buffer);
    return result.text;
  }

  // Excel 파일 파싱
  async parseExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    let content = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_csv(sheet);
      content += `Sheet: ${sheetName}\n${sheetData}\n\n`;
    });
    
    return content;
  }

  // PowerPoint 파일 파싱 (개선된 버전)
  async parsePowerPointFile(filePath) {
    try {
      this.debug(`PowerPoint 파일 파싱 시작: ${filePath}`);
      
      // PPTX 파일 읽기
      const data = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(data);
      
      let allText = '';
      
      // 슬라이드 파일들을 찾아서 처리
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      this.debug(`PowerPoint 슬라이드 파일 ${slideFiles.length}개 발견`);
      
      for (const slideFile of slideFiles) {
        try {
          const xmlContent = await zip.files[slideFile].async('text');
          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(xmlContent);
          
          // XML에서 텍스트 추출
          const slideText = this.extractTextFromXml(result);
          if (slideText) {
            allText += slideText + '\n\n';
          }
        } catch (error) {
          this.debug(`슬라이드 파일 ${slideFile} 파싱 오류: ${error.message}`);
        }
      }
      
      this.debug(`PowerPoint 파일 파싱 완료: ${filePath}, 추출된 텍스트 길이: ${allText.length}`);
      return allText;
    } catch (error) {
      this.debug(`PowerPoint 파일 파싱 오류: ${filePath} - ${error.message}`);
      return '';
    }
  }

  // XML에서 텍스트 추출 헬퍼 함수
  extractTextFromXml(xmlObj) {
    let texts = [];
    
    const traverse = (obj) => {
      if (obj && typeof obj === 'object') {
        // 텍스트 노드 찾기
        if (obj['a:t'] && Array.isArray(obj['a:t'])) {
          obj['a:t'].forEach(textNode => {
            if (typeof textNode === 'string') {
              texts.push(textNode);
            } else if (textNode._) {
              texts.push(textNode._);
            }
          });
        }
        
        // 재귀적으로 모든 프로퍼티 탐색
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            traverse(obj[key]);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item));
      }
    };
    
    traverse(xmlObj);
    return texts.join(' ').trim();
  }

  // 지원하는 파일 확장자 목록
  getSupportedExtensions() {
    return [
      '.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.csv',
      '.doc', '.docx', '.pdf', '.xls', '.xlsx', '.pptx'
    ];
  }

  // 파일이 지원되는지 확인
  isSupported(filePath) {
    const ext = this.getFileExtension(filePath);
    return this.getSupportedExtensions().includes(ext);
  }
}

module.exports = FileParser; 