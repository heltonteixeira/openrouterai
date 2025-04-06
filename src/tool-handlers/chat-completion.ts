import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { ToolResult } from '../types.js'; // Import the unified type

// Maximum context tokens (matches tool-handlers.ts)
const MAX_CONTEXT_TOKENS = 200000;

export interface ChatCompletionToolRequest {
  model?: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;                  // Add max_tokens parameter
  provider?: {                         // Add provider configuration
      // Phase 1
      quantizations?: string[];        // For quality filtering
      ignore?: string[];               // Block specific providers
      // Phase 2
      sort?: "price" | "throughput" | "latency"; // Sort providers
      order?: string[];                // Prioritized list of provider IDs
      require_parameters?: boolean;    // Only use providers supporting all params
      data_collection?: "allow" | "deny"; // Allow/deny data collection
      allow_fallbacks?: boolean;       // Control fallback behavior
  }
}

// Utility function to estimate token count (simplified)
function estimateTokenCount(text: string): number {
  // Rough approximation: 4 characters per token
  return Math.ceil(text.length / 4);
}

// Truncate messages to fit within the context window
function truncateMessagesToFit(
  messages: ChatCompletionMessageParam[],
  maxTokens: number
): ChatCompletionMessageParam[] {
  const truncated: ChatCompletionMessageParam[] = [];
  let currentTokenCount = 0;

  // Always include system message first if present
  if (messages[0]?.role === 'system') {
    truncated.push(messages[0]);
    currentTokenCount += estimateTokenCount(messages[0].content as string);
  }

  // Add messages from the end, respecting the token limit
  for (let i = messages.length - 1; i >= 0; i--) {
    // Skip system message if already added
    if (i === 0 && messages[0]?.role === 'system') continue;

    const messageContent = messages[i].content;
    // Handle potential null/undefined content safely
    const contentString = typeof messageContent === 'string' ? messageContent : '';
    const messageTokens = estimateTokenCount(contentString);

    if (currentTokenCount + messageTokens > maxTokens) break;

    truncated.unshift(messages[i]);
    currentTokenCount += messageTokens;
  }

  return truncated;
}

// Update function signature to return Promise<ToolResult>
export async function handleChatCompletion(
  request: { params: { arguments: ChatCompletionToolRequest } },
  openai: OpenAI,
  defaultModel?: string,
  defaultMaxTokens?: string, // Note: Comes as string from env var
  defaultQuantizations?: string[],
  defaultIgnoredProviders?: string[],
  // Phase 2 Defaults
  defaultSort?: "price" | "throughput" | "latency",
  defaultOrder?: string[],
  defaultRequireParameters?: boolean,
  defaultDataCollection?: "allow" | "deny",
  defaultAllowFallbacks?: boolean
): Promise<ToolResult> {
  const args = request.params.arguments;

  // Determine effective max_tokens
  const maxTokens = args.max_tokens ?? (defaultMaxTokens ? parseInt(defaultMaxTokens, 10) : undefined);
  if (maxTokens !== undefined && isNaN(maxTokens)) {
      // Handle potential parsing error if defaultMaxTokens is not a valid number string
      console.warn(`Invalid OPENROUTER_MAX_TOKENS value: ${defaultMaxTokens}. Ignoring.`);
      // Potentially return an error ToolResult here if strict validation is desired
  }

  // Determine effective provider config (Phase 1 & 2)
  const providerArgs = args.provider ?? {};
  const providerConfig: {
      quantizations?: string[];
      ignore?: string[];
      sort?: "price" | "throughput" | "latency";
      order?: string[];
      require_parameters?: boolean;
      data_collection?: "allow" | "deny";
      allow_fallbacks?: boolean;
  } = {};

  // Merge Phase 1
  const effectiveQuantizations = providerArgs.quantizations ?? defaultQuantizations;
  const effectiveIgnore = providerArgs.ignore ?? defaultIgnoredProviders;
  if (effectiveQuantizations && effectiveQuantizations.length > 0) {
      providerConfig.quantizations = effectiveQuantizations;
  }
  if (effectiveIgnore && effectiveIgnore.length > 0) {
      providerConfig.ignore = effectiveIgnore;
  }

  // Merge Phase 2
  const effectiveSort = providerArgs.sort ?? defaultSort;
  const effectiveOrder = providerArgs.order ?? defaultOrder;
  const effectiveRequireParameters = providerArgs.require_parameters ?? defaultRequireParameters;
  const effectiveDataCollection = providerArgs.data_collection ?? defaultDataCollection;
  const effectiveAllowFallbacks = providerArgs.allow_fallbacks ?? defaultAllowFallbacks;

  if (effectiveSort) providerConfig.sort = effectiveSort;
  if (effectiveOrder && effectiveOrder.length > 0) providerConfig.order = effectiveOrder;
  if (effectiveRequireParameters !== undefined) providerConfig.require_parameters = effectiveRequireParameters;
  if (effectiveDataCollection) providerConfig.data_collection = effectiveDataCollection;
  if (effectiveAllowFallbacks !== undefined) providerConfig.allow_fallbacks = effectiveAllowFallbacks;

  // Validate model selection
  const model = args.model || defaultModel;
  if (!model) {
    return {
      isError: true, // Ensure isError is present
      content: [
        {
          type: 'text',
          // Add "Error: " prefix
          text: 'Error: No model specified and no default model configured in MCP settings. Please specify a model or set OPENROUTER_DEFAULT_MODEL in the MCP configuration.',
        },
      ],
    };
  }

  // Validate message array
  if (!args.messages || args.messages.length === 0) { // Add check for undefined/null messages
    return {
      isError: true, // Ensure isError is present
      content: [
        {
          type: 'text',
          // Add "Error: " prefix
          text: 'Error: Messages array cannot be empty. At least one message is required.',
        },
      ],
    };
  }

  try {
    // Truncate messages to fit within context window
    const truncatedMessages = truncateMessagesToFit(args.messages, MAX_CONTEXT_TOKENS);

    const completionRequest: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model, // Use the validated model
      messages: truncatedMessages,
      temperature: args.temperature ?? 1,
      // Add max_tokens if defined and valid
      ...(maxTokens !== undefined && !isNaN(maxTokens) && { max_tokens: maxTokens }),
      // Add provider config if it has keys (now includes Phase 2)
      ...(Object.keys(providerConfig).length > 0 && { provider: providerConfig }),
    };

    // Log the request being sent (optional, for debugging)
    // console.log("Sending request to OpenRouter:", JSON.stringify(completionRequest, null, 2));

    const completion = await openai.chat.completions.create(completionRequest);

    // Format response to match OpenRouter schema
    const response = {
      id: `gen-${Date.now()}`,
      choices: [{
        finish_reason: completion.choices[0].finish_reason,
        message: {
          role: completion.choices[0].message.role,
          content: completion.choices[0].message.content || '',
          tool_calls: completion.choices[0].message.tool_calls
        }
      }],
      created: Math.floor(Date.now() / 1000),
      model: model,
      object: 'chat.completion',
      usage: completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    // Add isError: false to successful return
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error('Error during chat completion:', error); // Log the error
    // Handle known and unknown errors, always return ToolResult
    if (error instanceof Error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            // Add "Error: " prefix
            text: `Error: OpenRouter API error: ${error.message}`,
          },
        ],
      };
    } else {
      // Handle unknown errors
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Error: An unknown error occurred during chat completion.',
          },
        ],
      };
    }
    // DO NOT throw error;
  }
}