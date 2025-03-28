import { ModelCache } from '../model-cache.js';
import { ToolResult } from '../types.js'; // Import the unified type

export interface ValidateModelToolRequest {
  model: string;
}

// Update function signature to return Promise<ToolResult>
export async function handleValidateModel(
  request: { params: { arguments: ValidateModelToolRequest } },
  modelCache: ModelCache
): Promise<ToolResult> {
  const { model } = request.params.arguments;

  // Wrap core logic in try...catch
  try {
    const isValid = await modelCache.validateModel(model);

    // Modify return logic based on validity
    if (isValid) {
      // Return success ToolResult
      return {
        isError: false,
        content: [
          {
            type: 'text',
            // Keep simple JSON for valid response
            text: JSON.stringify({ model: model, valid: true }, null, 2),
          },
        ],
      };
    } else {
      // Return error ToolResult for invalid model
      return {
        isError: true,
        content: [
          {
            type: 'text',
            // Use simple error string
            text: `Error: Model not found: ${model}`,
          },
        ],
      };
    }
  } catch (error) {
    // Catch errors during model validation
    console.error(`Error validating model ${model}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: Failed to validate model: ${errorMessage}`,
        },
      ],
    };
  }
}