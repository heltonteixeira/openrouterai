# OpenRouter MCP Server

A Model Context Protocol (MCP) server that provides integration with OpenRouter.ai, allowing access to various AI models through a unified interface.

<a href="https://glama.ai/mcp/servers/xdnmf8yei0"><img width="380" height="200" src="https://glama.ai/mcp/servers/xdnmf8yei0/badge" alt="OpenRouter Server MCP server" /></a>

## Features

- Access to all OpenRouter.ai models through MCP tools
- Advanced model search and filtering capabilities
- Automatic rate limiting and error handling
- Model information caching for optimal performance
- Comprehensive model capability tracking

## Installation

```bash
npm install @mcpservers/openrouterai
```

## Configuration

Add the server to your MCP settings configuration file (`cline_mcp_settings.json` or `claude_desktop_config.json`):

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

Required environment variables:
- `OPENROUTER_API_KEY`: Your OpenRouter API key (get one at https://openrouter.ai/keys)
- `OPENROUTER_DEFAULT_MODEL` (optional): Default model to use for chat completions

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
  temperature?: number;    // Optional, defaults to 1.0
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
    functions?: boolean;
    tools?: boolean;
    vision?: boolean;
    json_mode?: boolean;
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

For detailed documentation, development setup, and implementation details, see [CONTRIBUTING.md](CONTRIBUTING.md).
