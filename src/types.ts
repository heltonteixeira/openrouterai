/**
 * Represents a single content item in a tool response.
 * Currently, only text content is supported.
 */
export interface ResponseContentItem {
  type: "text";
  text: string;
}

/**
 * Unified structure for all tool handler responses.
 * Follows the principles outlined in the refactoring plan.
 */
export interface ToolResult {
  /** Indicates whether the tool execution resulted in an error. */
  isError: boolean;
  /** An array of content items, typically containing a single text item with the result or error message. */
  content: ResponseContentItem[];
}