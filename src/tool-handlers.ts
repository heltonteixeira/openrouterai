import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';

import { ModelCache } from './model-cache.js';
import { OpenRouterAPIClient } from './openrouter-api.js';
import { ToolResult } from './types.js'; // Import the unified type
import { handleChatCompletion, ChatCompletionToolRequest } from './tool-handlers/chat-completion.js';
import { handleSearchModels, SearchModelsToolRequest } from './tool-handlers/search-models.js';
import { handleGetModelInfo, GetModelInfoToolRequest } from './tool-handlers/get-model-info.js';
import { handleValidateModel, ValidateModelToolRequest } from './tool-handlers/validate-model.js';

export class ToolHandlers {
  private server: Server;
  private openai: OpenAI;
  private modelCache: ModelCache;
  private apiClient: OpenRouterAPIClient;
  private defaultModel?: string;
  private defaultMaxTokens?: string;
  private defaultQuantizations?: string[];
  private defaultIgnoredProviders?: string[];
  // Phase 2 Defaults
  private readonly defaultProviderSort?: "price" | "throughput" | "latency";
  private readonly defaultProviderOrder?: string[];
  private readonly defaultProviderRequireParameters?: boolean;
  private readonly defaultProviderDataCollection?: "allow" | "deny";
  private readonly defaultProviderAllowFallbacks?: boolean;

  constructor(
    server: Server,
    apiKey: string,
    defaultModel?: string,
    defaultMaxTokens?: string,
    defaultQuantizations?: string[],
    defaultIgnoredProviders?: string[],
    // Phase 2 Defaults
    defaultProviderSort?: "price" | "throughput" | "latency",
    defaultProviderOrder?: string[],
    defaultProviderRequireParameters?: boolean,
    defaultProviderDataCollection?: "allow" | "deny",
    defaultProviderAllowFallbacks?: boolean
  ) {
    this.server = server;
    this.modelCache = ModelCache.getInstance();
    this.apiClient = new OpenRouterAPIClient(apiKey);
    this.defaultModel = defaultModel;
    this.defaultMaxTokens = defaultMaxTokens;
    this.defaultQuantizations = defaultQuantizations;
    this.defaultIgnoredProviders = defaultIgnoredProviders;
    // Phase 2 Defaults
    this.defaultProviderSort = defaultProviderSort;
    this.defaultProviderOrder = defaultProviderOrder;
    this.defaultProviderRequireParameters = defaultProviderRequireParameters;
    this.defaultProviderDataCollection = defaultProviderDataCollection;
    this.defaultProviderAllowFallbacks = defaultProviderAllowFallbacks;

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/heltonteixeira/openrouterai',
        'X-Title': 'MCP OpenRouter Server',
      },
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'chat_completion',
          description: 'Sends conversational context (messages) to OpenRouter.ai for completion using a specified model. Use this for dialogue, text generation, or instruction-following tasks. Supports advanced provider routing and parameter overrides. Returns the generated text response.',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: '(Optional) The specific OpenRouter model ID (e.g., "google/gemini-pro") to use for this completion request. If omitted, the server\'s configured default model will be used.',
              },
              messages: {
                type: 'array',
                description: '(Required) An ordered array of message objects representing the conversation history. Each object must include `role` ("system", "user", or "assistant") and `content` (the text of the message). Minimum 1 message, maximum 100.',
                minItems: 1,
                maxItems: 100,
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                      description: 'Indicates the originator of the message. Must be one of: "system", "user", "assistant".',
                    },
                    content: {
                      type: 'string',
                      description: 'The textual content of the message.',
                    },
                  },
                  required: ['role', 'content'],
                }              },
              temperature: {
                type: 'number',
                description: '(Optional) Controls the randomness of the generated output. Ranges from 0.0 (deterministic) to 2.0 (highly random). Affects creativity versus coherence.',
                minimum: 0,
                maximum: 2,
              },
              max_tokens: {
                  type: 'number',
                  description: '(Optional) Sets an upper limit on the number of tokens generated in the response. Overrides the server default if specified. Influences provider routing based on model context limits.',
              },
              provider: {
                  type: 'object',
                  description: '(Optional) An object allowing fine-grained control over how OpenRouter selects the underlying AI provider for this request, overriding any server-level defaults.',
                properties: {
                  quantizations: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '(Optional) Filters eligible providers to only those supporting the specified quantization levels (e.g., ["fp16", "int8"]). Overrides server default.',
                  },
                  ignore: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '(Optional) A list of provider IDs (e.g., ["openai", "mistralai"]) to explicitly exclude from consideration for this request. Overrides server default.',
                  },
                      // Phase 2 Options
                  sort: {
                          type: 'string',
                          enum: ['price', 'throughput', 'latency'],
                          description: '(Optional) Determines the primary criterion ("price", "throughput", or "latency") used to sort eligible providers before selection. Overrides server default.',
                  },
                  order: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '(Optional) Defines a specific, ordered list of preferred provider IDs. OpenRouter will attempt to use these providers in the given order. Overrides server default.',
                  },
                  require_parameters: {
                          type: 'boolean',
                          description: '(Optional) If set to true, restricts selection to only those providers that fully support *all* parameters included in this chat completion request. Overrides server default.',
                  },
                  data_collection: {
                          type: 'string',
                          enum: ['allow', 'deny'],
                          description: '(Optional) Specifies the user\'s preference regarding data collection by the underlying provider ("allow" or "deny"). Overrides server default.',
                  },
                  allow_fallbacks: {
                          type: 'boolean',
                          description: '(Optional) If set to true (default), allows OpenRouter to attempt using fallback providers if the initially selected provider(s) fail. Set to false to disable fallbacks. Overrides server default.',
                      }
                },
                  additionalProperties: true // Allow future properties for forward compatibility
              },
            },
            required: ['messages'],
          },
          // Context window management details can be added as a separate property
           maxContextTokens: 200000
        },
        {
          name: 'search_models',
          description: 'Queries the OpenRouter.ai model registry, filtering by various criteria like capabilities, pricing, or provider. Use this to discover models suitable for specific needs. Returns a list of matching model metadata objects.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '(Optional) A text query string to search within model names, descriptions, and provider details.',
              },
              provider: {
                type: 'string',
                description: '(Optional) Restricts the search to models offered by a specific provider ID (e.g., "openai", "anthropic").',
              },
              minContextLength: {
                type: 'number',
                description: '(Optional) Filters for models that support at least the specified context window size (in tokens).',
              },
              maxContextLength: {
                type: 'number',
                description: '(Optional) Filters for models that support at most the specified context window size (in tokens).',
              },
              maxPromptPrice: {
                type: 'number',
                description: '(Optional) Filters for models whose price for processing 1,000 prompt tokens is less than or equal to this value.',
              },
              maxCompletionPrice: {
                type: 'number',
                description: '(Optional) Filters for models whose price for generating 1,000 completion tokens is less than or equal to this value.',
              },
              capabilities: {
                type: 'object',
                description: '(Optional) An object specifying required model capabilities.',
                properties: {
                  functions: {
                    type: 'boolean',
                    description: '(Optional) If true, filters for models that support function calling.',
                  },
                  tools: {
                    type: 'boolean',
                    description: '(Optional) If true, filters for models that support tool usage.',
                  },
                  vision: {
                    type: 'boolean',
                    description: '(Optional) If true, filters for models that support image input (vision).',
                  },
                  json_mode: {
                    type: 'boolean',
                    description: '(Optional) If true, filters for models that support guaranteed JSON output mode.',
                  }
                }
              },
              limit: {
                type: 'number',
                description: '(Optional) Limits the number of matching models returned in the response. Must be between 1 and 50. Defaults to 10.',
                minimum: 1,
                maximum: 50
              }
            }
          },
        },
        {
          name: 'get_model_info',
          description: 'Retrieves the complete metadata for a single OpenRouter.ai model specified by its unique ID. Use this when you know the model ID and need its full details (pricing, context limits, capabilities, etc.). Returns a model information object.',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: '(Required) The unique identifier string of the OpenRouter.ai model whose details are being requested.',
              },
            },
            required: ['model'],
          },
        },
        {
          name: 'validate_model',
          description: 'Verifies if a given model ID exists within the OpenRouter.ai registry. Use this for a quick check of model ID validity before making other API calls. Returns a boolean value (`true` if valid, `false` otherwise).',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: '(Required) The unique identifier string of the OpenRouter.ai model to check for validity.',
              },
            },
            required: ['model'],
          },
        },
      ],
    }));

    // Remove explicit return type annotation
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Wrap the entire handler logic in a try...catch
      try {
        switch (request.params.name) {
          case 'chat_completion':
            // Add 'as any' to satisfy SDK type checker
            return handleChatCompletion({
              params: {
                arguments: request.params.arguments as unknown as ChatCompletionToolRequest
              }
            },
            this.openai,
            this.defaultModel,
            this.defaultMaxTokens,
            this.defaultQuantizations,
            this.defaultIgnoredProviders,
            // Pass Phase 2 defaults
            this.defaultProviderSort,
            this.defaultProviderOrder,
            this.defaultProviderRequireParameters,
            this.defaultProviderDataCollection,
            this.defaultProviderAllowFallbacks
            ) as any;
          
          case 'search_models':
            // Add 'as any' to satisfy SDK type checker
            return handleSearchModels({
              params: {
                arguments: request.params.arguments as SearchModelsToolRequest
              }
            }, this.apiClient, this.modelCache) as any;
          
          case 'get_model_info':
            // Add 'as any' to satisfy SDK type checker
            return handleGetModelInfo({
              params: {
                arguments: request.params.arguments as unknown as GetModelInfoToolRequest
              }
            }, this.modelCache) as any;
          
          case 'validate_model':
            // Add 'as any' to satisfy SDK type checker
            return handleValidateModel({
              params: {
                arguments: request.params.arguments as unknown as ValidateModelToolRequest
              }
            }, this.modelCache) as any;
          
          default:
            // Return ToolResult for unknown tool
            console.warn(`Unknown tool requested: ${request.params.name}`);
            return {
              isError: true,
              content: [{ type: 'text', text: `Error: Tool '${request.params.name}' not found.` }],
            } as any; // Add 'as any'
        }
      } catch (error) {
        // Catch unexpected errors within the handler itself
        console.error('Unexpected error in CallToolRequest handler:', error);
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: Internal server error occurred while processing the tool call.' }],
        } as any; // Add 'as any'
      }
    });
  }
}