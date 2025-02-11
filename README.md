# OpenRouter MCP Server

[![MCP Server](https://img.shields.io/badge/MCP-Server-green)](https://github.com/heltonteixeira/openrouterai)
[![Version](https://img.shields.io/badge/version-2.0.3-blue)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-brightgreen)](LICENSE)
[![smithery badge](https://smithery.ai/badge/@mcpserver/openrouterai)](https://smithery.ai/server/@mcpserver/openrouterai)

A Model Context Protocol (MCP) server providing seamless integration with OpenRouter.ai's diverse model ecosystem. Access various AI models through a unified, type-safe interface with built-in caching, rate limiting, and error handling.

<a href="https://glama.ai/mcp/servers/xdnmf8yei0"><img width="380" height="200" src="https://glama.ai/mcp/servers/xdnmf8yei0/badge" alt="OpenRouter Server MCP server" /></a>

## Features

- **Model Access**
  - Direct access to all OpenRouter.ai models
  - Automatic model validation and capability checking
  - Default model configuration support

- **Performance Optimization**
  - Smart model information caching (1-hour expiry)
  - Automatic rate limit management
  - Exponential backoff for failed requests

- **Robust Error Handling**
  - Detailed error messages with context
  - Rate limit detection and recovery
  - Network timeout handling with retries

## Installation

### Installing via Smithery

To install OpenRouter MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@mcpserver/openrouterai):

```bash
npx -y @smithery/cli install @mcpserver/openrouterai --client claude
```

### Manual Installation
```bash
npm install @mcpservers/openrouterai
```

## Configuration

### Prerequisites

1. Get your OpenRouter API key from [OpenRouter Keys](https://openrouter.ai/keys)
2. Choose a default model (optional)

### Setup

Add to your MCP settings configuration file (`cline_mcp_settings.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "openrouterai": {
      "command": "npx",
      "args": ["@mcpservers/openrouterai"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here",
        "OPENROUTER_DEFAULT_MODEL": "optional-default-model"
      }
    }
  }
}
```

## Available Tools

### chat_completion
Send messages to OpenRouter.ai models:
```typescript
{
  model?: string;          // Optional if default model is set
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature?: number;    // Optional (0-2), defaults to 1.0
}
```

### search_models
Search and filter available models:
```typescript
{
  query?: string;          // Search in name/description
  provider?: string;       // Filter by provider
  minContextLength?: number;
  maxContextLength?: number;
  maxPromptPrice?: number;
  maxCompletionPrice?: number;
  capabilities?: {
    functions?: boolean;   // Function calling support
    tools?: boolean;       // Tool use support
    vision?: boolean;      // Image processing support
    json_mode?: boolean;   // JSON mode support
  };
  limit?: number;          // Default: 10, max: 50
}
```

### get_model_info
Get detailed information about a specific model:
```typescript
{
  model: string;           // Model identifier
}
```

### validate_model
Check if a model ID is valid:
```typescript
{
  model: string;           // Model identifier to validate
}
```

## Rate Limiting

The server implements intelligent rate limit handling:
- Tracks remaining requests through response headers
- Automatically waits when rate limits are reached
- Implements exponential backoff for failed requests
- Provides clear error messages for rate limit issues

## Error Handling

The server uses `McpError` for MCP-specific errors with clear messages:
- Invalid model errors
- API rate limiting
- Authentication issues
- Network errors
- Invalid parameter errors

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about:
- Development setup
- Project structure
- Feature implementation
- Error handling guidelines
- Tool usage examples

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and migration guides.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.