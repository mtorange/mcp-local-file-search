# MCP Local File Search

A Model Context Protocol (MCP) server that indexes and searches local files.

> **한국어 버전은 [README_KR.md](README_KR.md)를 참고하세요.**

## Features

- Support for various file formats (txt, md, doc, docx, pdf, xls, xlsx, pptx, etc.)
- Advanced search using BM25 algorithm
- File change detection and incremental indexing
- AI tool integration via MCP protocol
- Command-line interface provided

## Installation

```bash
# Global installation (recommended)
npm install -g @mtorange/mcp-local-file-search
```

After installation, you can use the `local-file` command.

## Usage

### Commands

#### 1. Run MCP Mode
```bash
# After global installation
local-file mcp --dir=/path/to/file

# Or use directly with npx
npx @mtorange/mcp-local-file-search mcp --dir=/path/to/file
```

#### 2. Text Search
```bash
# After global installation
local-file search "text to search" --dir=/path/to/file

# Or use directly with npx
npx @mtorange/mcp-local-file-search search "text to search" --dir=/path/to/file
```

#### 3. File Indexing
```bash
# After global installation
local-file index --dir=/path/to/file

# Or use directly with npx
npx @mtorange/mcp-local-file-search index --dir=/path/to/file
```

#### 4. Force Reindexing
```bash
# After global installation
local-file index --dir=/path/to/file --force

# Or use directly with npx
npx @mtorange/mcp-local-file-search index --dir=/path/to/file --force
```

### Options

- `--dir=<directory>`: Specify directory to index
- `--debug-log=<file>`: Output debug logs to file
- `--force`: Force reindexing regardless of file changes
- `--help`: Show help

### MCP Tools

The following tools are available in MCP mode:

1. **search-local**: Search text in local files
2. **search-in-file**: Search text in specific file
3. **get-index-stats**: Get index statistics
4. **find-similar-files**: Find similar files
5. **reindex**: Reindex files

## Supported File Formats

- Text: `.txt`, `.md`, `.json`, `.js`, `.ts`, `.html`, `.css`, `.xml`, `.csv`
- Documents: `.doc`, `.docx`, `.pdf`
- Spreadsheets: `.xls`, `.xlsx`
- Presentations: `.pptx`

## Examples

### 1. Basic Usage
```bash
# Index current directory
local-file index

# Search for specific text
local-file search "JavaScript"

# Run MCP server
local-file mcp --debug-log=debug.log
```

### 2. Working with Specific Directory
```bash
# Index documents directory
local-file index --dir=~/Documents

# Search in documents
local-file search "project" --dir=~/Documents

# Run MCP server
local-file mcp --dir=~/Documents
```

### 3. Debug Mode
```bash
# Run MCP server with debug logging
local-file mcp --dir=~/Documents --debug-log=debug.log
```

### 4. Using npx Directly
```bash
# Use without global installation
npx @mtorange/mcp-local-file-search mcp --dir=/path/to/file
npx @mtorange/mcp-local-file-search search "search term" --dir=/path/to/file
```

## Index File

The index is saved as `.local-file-index.json` in the target directory. This file contains:

- File content and metadata
- Term frequency statistics
- Global statistics for BM25 calculation

The index file is created when running the `index` command or when running the `mcp` command.
Therefore, the first run of the `mcp` command may take some time.

## Performance Optimization

- Incremental indexing through file change detection
- Exclude hidden files and `node_modules` directories
- Automatic filtering of unsupported file formats

## Language Support

The application automatically detects the system language and displays messages accordingly.

### Supported Languages

- **English (en)** - Default language
- **Korean (ko)** - Korean language support
- **Japanese (ja)** - Japanese language support  
- **Chinese (zh)** - Chinese language support

### Language Detection Priority

1. **MCP_LANG** environment variable (highest priority)
2. **LANGUAGE** environment variable
3. **LC_ALL** environment variable
4. **LC_MESSAGES** environment variable
5. **LANG** environment variable
6. **Node.js Intl API** (system locale)
7. **English** (default fallback)

### Setting Language

You can set the language using environment variables:

```bash
# Use Korean (global installation)
MCP_LANG=ko local-file search "검색어"

# Use Korean (with npx)
MCP_LANG=ko npx @mtorange/mcp-local-file-search search "검색어"

# Use English (global installation)
MCP_LANG=en local-file search "search term"

# Use English (with npx)
MCP_LANG=en npx @mtorange/mcp-local-file-search search "search term"

# Use Japanese (global installation)
MCP_LANG=ja local-file search "検索語"

# Use Japanese (with npx)
MCP_LANG=ja npx @mtorange/mcp-local-file-search search "検索語"

# Set system-wide language
export LANG=ko_KR.UTF-8
local-file search "검색어"
# Or with npx
export LANG=ko_KR.UTF-8
npx @mtorange/mcp-local-file-search search "검색어"
```

### Language Detection Info

Check current language detection:

```bash
# With global installation
local-file lang-info

# With npx
npx @mtorange/mcp-local-file-search lang-info
```

This command shows:
- Current detected locale
- Environment variables
- Test messages in the current language

## Claude Desktop Integration

To integrate with Claude Desktop, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "local-file": {
      "command": "npx",
      "args": ["-y", "@mtorange/mcp-local-file-search@latest", "mcp", "--dir=/path/to/your/files"]
    }
  }
}
```

## Troubleshooting

### Index file not found error
```bash
# With global installation
local-file index --dir=/path/to/file

# With npx
npx @mtorange/mcp-local-file-search index --dir=/path/to/file
```

### No search results
- Check if files are properly indexed
- Verify supported file formats
- Try different search terms

### File parsing errors
- Check if files are not corrupted
- Verify file format is supported
- Try reindexing with `--force` option:
```bash
# With global installation
local-file index --dir=/path/to/file --force

# With npx
npx @mtorange/mcp-local-file-search index --dir=/path/to/file --force
```

## Development

### Building from Source
```bash
git clone https://github.com/mtorange/mcp-local-file-search.git
cd mcp-local-file-search
npm install
npm start
```

### Testing
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Author

MC.Song <mtorange@gmail.com>

## Links

- [GitHub Repository](https://github.com/mtorange/mcp-local-file-search)
- [NPM Package](https://www.npmjs.com/package/@mtorange/mcp-local-file-search)
- [Issues](https://github.com/mtorange/mcp-local-file-search/issues) 