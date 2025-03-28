#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { ToolHandlers } from './tool-handlers.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL;

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
      DEFAULT_MODEL
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
