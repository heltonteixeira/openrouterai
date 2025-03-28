import { ModelCache } from '../model-cache.js';
import { ToolResult } from '../types.js'; // Import the unified type

export interface GetModelInfoToolRequest {
  model: string;
}

// Update function signature to return Promise<ToolResult>
export async function handleGetModelInfo(
  request: { params: { arguments: GetModelInfoToolRequest } },
  modelCache: ModelCache
): Promise<ToolResult> {
  const { model } = request.params.arguments;

  // Wrap core logic in try...catch
  try {
    const modelInfo = await modelCache.getModelInfo(model);

    if (!modelInfo) {
      return {
        isError: true, // Ensure isError is present
        content: [
          {
            type: 'text',
            // Add "Error: " prefix
            text: `Error: Model not found: ${model}`,
          },
        ],
      };
    }

    // Format successful response
    const response = {
      id: `info-${Date.now()}`,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: modelInfo.id.split('/')[0],
      permission: [],
      root: modelInfo.id,
      parent: null,
      data: {
        id: modelInfo.id,
        name: modelInfo.name,
        description: modelInfo.description || 'No description available',
        context_length: modelInfo.context_length,
        pricing: {
          prompt: `$${modelInfo.pricing.prompt}/1K tokens`,
          completion: `$${modelInfo.pricing.completion}/1K tokens`
        },
        capabilities: {
          functions: modelInfo.capabilities?.functions || false,
          tools: modelInfo.capabilities?.tools || false,
          vision: modelInfo.capabilities?.vision || false,
          json_mode: modelInfo.capabilities?.json_mode || false
        }
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
    // Catch errors during model info retrieval
    console.error(`Error getting model info for ${model}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: Failed to get model info: ${errorMessage}`,
        },
      ],
    };
  }
}