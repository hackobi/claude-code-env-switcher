# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

**Files:**
- kebab-case for filenames: `ai-generator.ts`, `fallback-generator.ts`, `content-pipeline.ts`
- Class export files use simple names: `index.ts` for barrel exports
- Integration files prefixed with domain: `twitter.ts`, `linear.ts`, `typefully.ts`
- Utilities in dedicated directories: `src/integrations/`, `src/content/`, `src/database/`

**Functions:**
- camelCase for all function names: `createChallenge()`, `authenticate()`, `savePlayer()`, `generateContent()`
- Private methods prefixed with underscore: `_cleanup()`, `_checkRateLimit()`, `_rowToUnit()`
- Async functions use async/await pattern, named descriptively: `generate()`, `run()`, `initialize()`

**Variables:**
- camelCase for local variables: `testPlayer`, `sourceText`, `playerData`
- UPPER_CASE for constants: `TEST_DB_PATH`, `VALID_ADDRESS`, `DEMOS_BRAND_VOICE`
- Boolean variables prefixed with `is` or `has`: `isPremium`, `isMockMode`, `hasError`
- Private class members prefixed with underscore: `_db`, `_stmts`, `_challenges`
- Map/Set collections with plural or descriptive names: `players`, `units`, `challenges`, `usedNonces`

**Types:**
- PascalCase for all type definitions: `GeneratedContent`, `GenerationContext`, `PipelineConfig`, `TweetRecord`
- Interface names do NOT use `I` prefix: `GeneratedContent` not `IGeneratedContent`
- Type aliases for unions: `type ContentType = 'tweet' | 'thread' | 'article'`
- Database record types suffixed with `Record`: `TweetRecord`, `ArticleRecord`, `LinearTaskRecord`

## Code Style

**Formatting:**
- Tool: Prettier
- Settings (kynesys-node baseline):
  - Print width: 80 characters
  - Tab width: 4 spaces
  - Quotes: double quotes (`"string"`)
  - Semicolons: disabled (none) — code omits trailing semicolons
  - Trailing comma: "all-multiline"
  - Arrow functions: parentheses only when needed (`avoid`)
  - Line endings: LF (Unix)
  - Bracket spacing: enabled

**Linting:**
- Tool: ESLint with TypeScript support
- Parser: `@typescript-eslint/parser`
- Extends: `eslint:recommended` + `plugin:@typescript-eslint/recommended`
- Key rules (kynesys-node):
  - `quotes: ["error", "double"]` — enforce double quotes
  - `semi: ["error", "never"]` — no semicolons
  - `no-unused-vars: ["off"]` — disabled, not enforced
  - `@typescript-eslint/no-unused-vars: ["off"]` — TypeScript unused vars not enforced
  - `@typescript-eslint/naming-convention` — enforces patterns:
    - Variables/parameters: camelCase or UPPER_CASE
    - Functions: camelCase
    - Classes: PascalCase
    - Interfaces: PascalCase (no I prefix)
    - Type aliases: PascalCase
  - `comma-dangle: ["error", "always-multiline"]` — trailing commas in multiline structures
  - `no-console: ["off"]` — console logging allowed (not enforced)

## Import Organization

**Order:**
1. Node.js built-in modules: `import * as fs from 'fs'`, `import path from 'path'`
2. Third-party packages: `import { TwitterApi } from 'twitter-api-v2'`, `import Database from 'better-sqlite3'`
3. Local type/interface imports: `import { GeneratedContent, GenerationContext } from './ai-generator'`
4. Local class/function imports: `import ContentDatabase from '../database'`, `import RelevanceScorer from '../content/relevance-scorer'`
5. Barrel exports from index files: `import { ContentDatabase, getDatabase } from '../database'`

**Path Aliases:**
- Relative imports used throughout: `../integrations/`, `../../database/`
- No documented path aliases configured in examined projects
- Module resolution: Node.js standard

## Error Handling

**Patterns:**
- Try-catch blocks with typed error logging:
  ```typescript
  try {
    // operation
  } catch (error: any) {
    console.error('Error context:', error.message);
    throw error; // Re-throw for upstream handling
  }
  ```
- Silent failures with null returns in fallback paths:
  ```typescript
  try {
    return result;
  } catch (error) {
    console.error('Fallback generation failed:', error);
    return null;
  }
  ```
- Explicit error checks before operations:
  ```typescript
  if (!value) {
    throw new Error('value is required');
  }
  ```
- Custom error classes not observed; uses native `Error` with descriptive messages
- Async functions reject with `Error` objects: `reject(new Error('message'))`

## Logging

**Framework:** console object (not abstracted)

**Patterns:**
- `console.log()` for info and progress: `console.log('🚀 Starting content pipeline...')`
- `console.warn()` for non-critical issues: `console.warn('Claude CLI not found')`
- `console.error()` for errors: `console.error('Error generating content:', error.message)`
- Emoji prefixes for log types:
  - `🚀` pipeline start/major operations
  - `📊` database operations
  - `🎨` visual/image operations
  - `🔄` fallback operations
  - `⚠️` warnings
  - `✓` successful completion
- Logging at boundaries (input/output of major functions)
- No log levels or structured logging observed

## Comments

**When to Comment:**
- Explain *why*, not *what* — code is self-documenting
- Block comments for multi-line explanations:
  ```typescript
  // ═══════════════════════════════════════════════════════════════
  // TOP KAITO LEADERBOARD INFLUENCERS (Verified Active)
  // ═══════════════════════════════════════════════════════════════
  ```
- Inline comments for algorithm clarification or non-obvious decisions
- NOTE, INFO, BUG, HACK prefixes observed in kynesys-node:
  ```typescript
  // NOTE Constant prompting
  // INFO This is the main client
  ```

**JSDoc/TSDoc:**
- Optional JSDoc for public class methods and functions
- Block-style documentation for class purpose:
  ```typescript
  /**
   * SQLite database for marketing intelligence content history
   */
  export class ContentDatabase { ... }
  ```
- Method documentation when behavior is complex:
  ```typescript
  /**
   * Run the full content pipeline
   */
  async run(): Promise<PipelineResult> { ... }
  ```

## Function Design

**Size:** Functions range 10-100 lines, complex operations broken into helper methods
- Generator functions: 300+ lines (orchestration/setup), split by concern
- Database methods: 20-50 lines (focused on single operation)
- Utility functions: 5-40 lines (pure transformations)

**Parameters:**
- Positional parameters for required values
- Config objects for optional/configuration parameters:
  ```typescript
  constructor(
    apiKey: string,
    config: Partial<PipelineConfig> = {}
  )
  ```
- Destructuring in parameters when multiple related options:
  ```typescript
  async authenticate(address: string, signature: string, nonce: string)
  ```

**Return Values:**
- Simple types for pure functions: `string`, `boolean`, `number`
- Promises for async operations: `Promise<GeneratedContent>`, `Promise<PipelineResult>`
- Union types for success/failure: `{ success: true; token: string } | { success: false; error: string }`
- Null for optional results: `GeneratedContent | null`
- Interfaces for complex returns: `PipelineResult` with `draftsCreated`, `errors`, `topDrafts`

## Module Design

**Exports:**
- Default export for main class: `export default ContentDatabase`
- Named exports for interfaces and types: `export interface GeneratedContent { ... }`
- Named exports for utility functions: `export function getDatabase() { ... }`
- Barrel files (`index.ts`) re-export public API:
  ```typescript
  export { ContentDatabase, getDatabase }
  export default ContentDatabase
  ```

**Barrel Files:**
- `src/database/index.ts` exports database class and interfaces
- Used to group related functionality: `src/integrations/`, `src/content/`
- Simplify import paths: `import { ContentDatabase } from '../database'` instead of `from '../database/index'`

---

*Convention analysis: 2026-03-14*
