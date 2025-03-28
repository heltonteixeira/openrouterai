# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-03-27
### Added
- Unified ToolResult response format for all tool handlers
- Structured error messages with "Error: " prefix consistency
- Comprehensive error handling documentation in README

### Changed
- Updated all tool handlers to use new response format
- Improved error messages with contextual information
- Refactored core error handling infrastructure

### Fixed
- Removed residual JSON-RPC error code references
- Standardized success/error response structures


## [2.1.0] - 2025-02-10
### Added
- Conversation context support
- MCP server badge
### Refactor
- Modular structure
### Chore
- Bump version to 2.1.0
- Update dependencies and TypeScript config
- Update .gitignore remove project specific files
### Documentation
- Improve README with comprehensive documentation and badges

## [2.0.3] - 2024-03-22
### Changed
- Updated dependencies to latest versions:
  - axios to ^1.7.9
  - openai to ^4.77.0
  - typescript to ^5.7.2
- Updated .gitignore file list
- Fixed package.json bin configuration format
### Added
- Package overrides to fix punycode deprecation warning:
  - Added uri-js-replace to replace deprecated uri-js
  - Updated whatwg-url to v14.1.0
### Fixed
- Updated repository URLs to correct GitHub repository
- Fixed Node.js punycode deprecation warning (DEP0040)

## [2.0.2] - 2024-03-21
### Changed
- Simplified binary name to 'openrouterai'

## [2.0.1] - 2024-03-21
### Added
- Complete npm package configuration
- Binary support for CLI installation
- Repository and documentation links
- Node.js engine requirement specification
- PrepublishOnly script for build safety

## [2.0.0] - 2024-03-20
### Breaking Changes
- Remove list_models tool in favor of enhanced search_models
- Remove set_default_model and clear_default_model in favor of config-based default model
- Move default model to MCP configuration via OPENROUTER_DEFAULT_MODEL environment variable

### Added
- Comprehensive model filtering capabilities
- Direct OpenRouter /models endpoint integration
- Accurate model data (pricing, context length, capabilities)
- Rate limiting with exponential backoff
- Model capability validation
- Cache invalidation strategy
- Enhanced error handling with detailed feedback

### Changed
- Rename StateManager to ModelCache for better clarity
- Update error messages to reference MCP configuration
- Switch from OpenAI SDK models.list() to direct OpenRouter API calls
- Update package name to @mcpservers/openrouterai
- Update documentation to follow MCP server standards

## [1.0.0] - 2024-03-15
### Added
- Initial OpenRouter MCP server implementation
- Basic model management features and state handling
- Core API integration
- Project documentation and configuration files

### Changed
- Update license to Apache 2.0

[2.2.0]: https://github.com/mcpservers/openrouterai/compare/v2.1.0...v2.2.0
[2.0.2]: https://github.com/mcpservers/openrouterai/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/mcpservers/openrouterai/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/mcpservers/openrouterai/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/mcpservers/openrouterai/releases/tag/v1.0.0
