import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { ToolResult } from '../types.js'; // Import the unified type

// Maximum context tokens (matches tool-handlers.ts)
const MAX_CONTEXT_TOKENS = 200000;

export interface ChatCompletionToolRequest {
  model?: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
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
  defaultModel?: string
): Promise<ToolResult> {
  const args = request.params.arguments;

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

    const completion = await openai.chat.completions.create({
      model,
      messages: truncatedMessages,
      temperature: args.temperature ?? 1,
    });

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