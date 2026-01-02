# Demos SDK MCP Server Setup

## Quick Install

```bash
# Add the Demos SDK MCP server to Claude Code
claude mcp add demos-sdk -- npx -y @kynesyslabs/demosdk-mcp-server

# Or clone and install manually
git clone https://github.com/kynesyslabs/demosdk-mcp-server
cd demosdk-mcp-server
npm install
npm run build

# Add local installation
claude mcp add demos-sdk -- node /path/to/demosdk-mcp-server/dist/index.js
```

## Verify Installation

```bash
claude mcp list
```

Expected output:
```
demos-sdk: npx -y @kynesyslabs/demosdk-mcp-server - ✓ Connected
```

## Available Tools

Once installed, you'll have access to these MCP tools:

| Tool | Description |
|------|-------------|
| `demos_network_sdk_search_content` | Search SDK documentation |
| `demos_network_sdk_get_page` | Get specific documentation page |
| `demos_network_sdk_list_sections` | List table of contents |
| `demos_network_sdk_get_section_pages` | List pages in a section |
| `demos_network_sdk_get_code_blocks` | Extract code examples |
| `demos_network_sdk_get_markdown` | Get page as markdown |
| `demos_network_sdk_refresh_content` | Update cached content |

## Usage Examples

### Search for DAHR documentation
```
Use demos_network_sdk_search_content with query "DAHR Web2 proxy attestation"
```

### Get cross-chain documentation
```
Use demos_network_sdk_get_page with page "sdk/cross-chain"
```

### List all SDK sections
```
Use demos_network_sdk_list_sections
```

## Context7 Alternative

If the MCP server isn't installed, use Context7 with the Demos SDK library:

```typescript
// Library ID for Context7
libraryId: "/websites/kynesyslabs_github_io_demosdk-api-ref"

// Example query
mcp__context7__query-docs({
  libraryId: "/websites/kynesyslabs_github_io_demosdk-api-ref",
  query: "How to create DAHR instance"
})
```

## Configuration File

Add to your Claude Code MCP config (`~/.config/claude-code/mcp.json`):

```json
{
  "mcpServers": {
    "demos-sdk": {
      "command": "npx",
      "args": ["-y", "@kynesyslabs/demosdk-mcp-server"],
      "env": {}
    }
  }
}
```

## Troubleshooting

### Server not connecting
```bash
# Check if package exists
npm view @kynesyslabs/demosdk-mcp-server

# Try manual installation
npm install -g @kynesyslabs/demosdk-mcp-server
claude mcp add demos-sdk -- demosdk-mcp-server
```

### Clear cache and restart
```bash
claude mcp remove demos-sdk
claude mcp add demos-sdk -- npx -y @kynesyslabs/demosdk-mcp-server
```
