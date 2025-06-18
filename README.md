[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/heltonteixeira-openrouterai-badge.png)](https://mseep.ai/app/heltonteixeira-openrouterai)

# OpenRouter MCP Server

[![MCP Server](https://img.shields.io/badge/MCP-Server-green)](https://github.com/heltonteixeira/openrouterai)
[![Version](https://img.shields.io/badge/version-2.2.0-blue)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-brightgreen)](LICENSE)

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

- **Unified Response Format**
  - Consistent `ToolResult` structure for all responses
  - Clear error identification with `isError` flag
  - Structured error messages with context
## Installation

```bash
pnpm install @mcpservers/openrouterai
```

## Configuration

### Prerequisites

1.  Get your OpenRouter API key from [OpenRouter Keys](https://openrouter.ai/keys)
2.  Choose a default model (optional)

### Environment Variables

*   `OPENROUTER_API_KEY`: **Required**. Your OpenRouter API key.
*   `OPENROUTER_DEFAULT_MODEL`: Optional. The default model to use if not specified in the request (e.g., `openrouter/auto`).
*   `OPENROUTER_MAX_TOKENS`: Optional. Default maximum number of tokens to generate if `max_tokens` is not provided in the request.
*   `OPENROUTER_PROVIDER_QUANTIZATIONS`: Optional. Comma-separated list of default quantization levels to filter by (e.g., `fp16,int8`) if `provider.quantizations` is not provided in the request. (Phase 1)
*   `OPENROUTER_PROVIDER_IGNORE`: Optional. Comma-separated list of default provider names to ignore (e.g., `mistralai,openai`) if `provider.ignore` is not provided in the request. (Phase 1)
*   `OPENROUTER_PROVIDER_SORT`: Optional. Default sort order for providers ("price", "throughput", or "latency"). Overridden by `provider.sort` argument. (Phase 2)
*   `OPENROUTER_PROVIDER_ORDER`: Optional. Default prioritized list of provider IDs (JSON array string, e.g., `'["openai/gpt-4o", "anthropic/claude-3-opus"]'`). Overridden by `provider.order` argument. (Phase 2)
*   `OPENROUTER_PROVIDER_REQUIRE_PARAMETERS`: Optional. Default boolean (`true` or `false`) to only use providers supporting all specified request parameters. Overridden by `provider.require_parameters` argument. (Phase 2)
*   `OPENROUTER_PROVIDER_DATA_COLLECTION`: Optional. Default data collection policy ("allow" or "deny"). Overridden by `provider.data_collection` argument. (Phase 2)
*   `OPENROUTER_PROVIDER_ALLOW_FALLBACKS`: Optional. Default boolean (`true` or `false`) to control fallback behavior if preferred providers fail. Overridden by `provider.allow_fallbacks` argument. (Phase 2)

```env
# Example .env file content
OPENROUTER_API_KEY=your-api-key-here
OPENROUTER_DEFAULT_MODEL=openrouter/auto
OPENROUTER_MAX_TOKENS=1024
OPENROUTER_PROVIDER_QUANTIZATIONS=fp16,int8
OPENROUTER_PROVIDER_IGNORE=openai,anthropic
OPENROUTER_PROVIDER_SORT=price
OPENROUTER_PROVIDER_ORDER='["openai/gpt-4o", "anthropic/claude-3-opus"]'
OPENROUTER_PROVIDER_REQUIRE_PARAMETERS=true
OPENROUTER_PROVIDER_DATA_COLLECTION=deny
OPENROUTER_PROVIDER_ALLOW_FALLBACKS=false
```
OPENROUTER_PROVIDER_QUANTIZATIONS=fp16,int8
OPENROUTER_PROVIDER_IGNORE=openai,anthropic
```

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
        "OPENROUTER_DEFAULT_MODEL": "optional-default-model",
        "OPENROUTER_MAX_TOKENS": "1024",
        "OPENROUTER_PROVIDER_QUANTIZATIONS": "fp16,int8",
        "OPENROUTER_PROVIDER_IGNORE": "openai,anthropic"
      }
    }
  }
}

## Response Format

All tools return responses in a standardized structure:

```typescript
interface ToolResult {
  isError: boolean;
  content: Array<{
    type: "text";
    text: string; // JSON string or error message
  }>;
}
```

**Success Example:**
```json
{
  "isError": false,
  "content": [{
    "type": "text",
    "text": "{\"id\": \"gen-123\", ...}"
  }]
}
```

**Error Example:**
```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "Error: Model validation failed - 'invalid-model' not found"
  }]
}
```

## Available Tools

### `chat_completion`

Sends a request to the OpenRouter Chat Completions API.

**Input Schema:**

*   `model` (string, optional): The model to use (e.g., `openai/gpt-4o`, `google/gemini-pro`). Overrides `OPENROUTER_DEFAULT_MODEL`. Defaults to `openrouter/auto` if neither is set.
    *   **Model Suffixes:** You can append `:nitro` to a model ID (e.g., `openai/gpt-4o:nitro`) to potentially route to faster, experimental versions if available. Append `:floor` (e.g., `mistralai/mistral-7b-instruct:floor`) to use the cheapest available variant of a model, often useful for testing or low-cost tasks. Note: Availability of `:nitro` and `:floor` variants depends on OpenRouter.
*   `messages` (array, required): An array of message objects conforming to the OpenAI chat completion format.
*   `temperature` (number, optional): Sampling temperature. Defaults to 1.
*   `max_tokens` (number, optional): Maximum number of tokens to generate in the completion. Overrides `OPENROUTER_MAX_TOKENS`.
*   `provider` (object, optional): Provider routing configuration. Overrides corresponding `OPENROUTER_PROVIDER_*` environment variables.
    *   `quantizations` (array of strings, optional): List of quantization levels to filter by (e.g., `["fp16", "int8"]`). Only models matching one of these levels will be considered. Overrides `OPENROUTER_PROVIDER_QUANTIZATIONS`. (Phase 1)
    *   `ignore` (array of strings, optional): List of provider names to exclude (e.g., `["openai", "anthropic"]`). Models from these providers will not be used. Overrides `OPENROUTER_PROVIDER_IGNORE`. (Phase 1)
    *   `sort` ("price" | "throughput" | "latency", optional): Sort providers by the specified criteria. Overrides `OPENROUTER_PROVIDER_SORT`. (Phase 2)
    *   `order` (array of strings, optional): A prioritized list of provider IDs (e.g., `["openai/gpt-4o", "anthropic/claude-3-opus"]`). Overrides `OPENROUTER_PROVIDER_ORDER`. (Phase 2)
    *   `require_parameters` (boolean, optional): If true, only use providers that support all specified request parameters (like tools, functions, temperature). Overrides `OPENROUTER_PROVIDER_REQUIRE_PARAMETERS`. (Phase 2)
    *   `data_collection` ("allow" | "deny", optional): Specify whether providers are allowed to collect data from the request. Overrides `OPENROUTER_PROVIDER_DATA_COLLECTION`. (Phase 2)
    *   `allow_fallbacks` (boolean, optional): If true (default), allows falling back to other providers if the preferred ones fail or are unavailable. If false, fails the request if preferred providers cannot be used. Overrides `OPENROUTER_PROVIDER_ALLOW_FALLBACKS`. (Phase 2)

**Example Usage:**

```json
{
  "tool": "chat_completion",
  "arguments": {
    "model": "anthropic/claude-3-haiku",
    "messages": [
      { "role": "user", "content": "Explain the concept of quantization in AI models." }
    ],
    "max_tokens": 500,
    "provider": {
      "quantizations": ["fp16"],
      "ignore": ["openai"],
      "sort": "price",
      "order": ["anthropic/claude-3-haiku", "google/gemini-pro"],
      "require_parameters": true,
      "allow_fallbacks": false
    }
  }
}
```

This example requests a completion from `anthropic/claude-3-haiku`, limits the response to 500 tokens. It specifies provider routing options: prefer `fp16` quantized models, ignore `openai` providers, sort remaining providers by `price`, prioritize `anthropic/claude-3-haiku` then `google/gemini-pro`, require the chosen provider to support all request parameters (like `max_tokens`), and disable fallbacks (fail if the prioritized providers cannot fulfill the request).

### search_models

Search and filter available models:

```typescript
interface ModelSearchRequest {
  query?: string;
  provider?: string;
  minContextLength?: number;
  capabilities?: {
    functions?: boolean;
    vision?: boolean;
  };
}

// Response: ToolResult with model list or error
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
interface ModelValidationRequest {
  model: string;
}

// Response: 
// Success: { isError: false, valid: true }
// Error: { isError: true, error: "Model not found" }
```

## Error Handling

The server provides structured errors with contextual information:

```typescript
// Error response structure
{
  isError: true,
  content: [{
    type: "text",
    text: "Error: [Category] - Detailed message"
  }]
}
```

**Common Error Categories:**
- `Validation Error`: Invalid input parameters
- `API Error`: OpenRouter API communication issues
- `Rate Limit`: Request throttling detection
- `Internal Error`: Server-side processing failures

**Handling Responses:**
```typescript
async function handleResponse(result: ToolResult) {
  if (result.isError) {
    const errorMessage = result.content[0].text;
    if (errorMessage.startsWith('Error: Rate Limit')) {
      // Handle rate limiting
    }
    // Other error handling
  } else {
    const data = JSON.parse(result.content[0].text);
    // Process successful response
  }
}
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about:
- Development setup
- Project structure
- Feature implementation
- Error handling guidelines
- Tool usage examples

```bash
# Install dependencies
pnpm install

# Build project
pnpm run build

# Run tests
pnpm test
```

## Changelog
See [CHANGELOG.md](./CHANGELOG.md) for recent updates including:
- Unified response format implementation
- Enhanced error handling system
- Type-safe interface improvements

## License
This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.