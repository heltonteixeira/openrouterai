#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { ToolHandlers } from './tool-handlers.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL;
const DEFAULT_MAX_TOKENS = process.env.OPENROUTER_MAX_TOKENS; // String | undefined
const DEFAULT_QUANTIZATIONS = process.env.OPENROUTER_PROVIDER_QUANTIZATIONS?.split(',').map(q => q.trim()).filter(q => q) || undefined; // string[] | undefined
const DEFAULT_IGNORED_PROVIDERS = process.env.OPENROUTER_PROVIDER_IGNORE?.split(',').map(p => p.trim()).filter(p => p) || undefined; // string[] | undefined

// Phase 2 Provider Defaults
const DEFAULT_PROVIDER_SORT = process.env.OPENROUTER_PROVIDER_SORT as "price" | "throughput" | "latency" | undefined; // Validate?
const DEFAULT_PROVIDER_ORDER = process.env.OPENROUTER_PROVIDER_ORDER?.split(',').map(p => p.trim()).filter(p => p) || undefined; // string[] | undefined
const DEFAULT_PROVIDER_REQUIRE_PARAMETERS = process.env.OPENROUTER_PROVIDER_REQUIRE_PARAMETERS?.toLowerCase() === 'true' ? true : undefined; // boolean | undefined
const DEFAULT_PROVIDER_DATA_COLLECTION = process.env.OPENROUTER_PROVIDER_DATA_COLLECTION as "allow" | "deny" | undefined; // Validate?
const DEFAULT_PROVIDER_ALLOW_FALLBACKS = process.env.OPENROUTER_PROVIDER_ALLOW_FALLBACKS?.toLowerCase() === 'true' ? true : undefined; // boolean | undefined

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

class OpenRouterServer {
  private server: Server;
  private toolHandlers: ToolHandlers;

  constructor() {
    this.server = new Server(
      {
        name: 'openrouter-server',
        version: '2.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tool handlers
    this.toolHandlers = new ToolHandlers(
      this.server,
      OPENROUTER_API_KEY!,
      DEFAULT_MODEL,
      DEFAULT_MAX_TOKENS,
      DEFAULT_QUANTIZATIONS,
      DEFAULT_IGNORED_PROVIDERS,
      // Pass Phase 2 Defaults
      DEFAULT_PROVIDER_SORT,
      DEFAULT_PROVIDER_ORDER,
      DEFAULT_PROVIDER_REQUIRE_PARAMETERS,
      DEFAULT_PROVIDER_DATA_COLLECTION,
      DEFAULT_PROVIDER_ALLOW_FALLBACKS
    );
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenRouter MCP server running on stdio');
  }
}

const server = new OpenRouterServer();
server.run().catch(console.error);
