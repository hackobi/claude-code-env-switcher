# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Runner:**
- Jest (v29.7.0+)
- Config: `jest.config.js` or implicit defaults

**Assertion Library:**
- Jest built-in matchers (expect API)

**Run Commands:**
```bash
npm test                  # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Generate coverage report
npm test -- --forceExit  # Force exit after tests (used in dwarf-fortress-nft-game)
```

## Test File Organization

**Location:**
- Separate test directory: `tests/` directory at project root
- Example: `/Users/jacobo/Documents/Claude/dwarf-fortress-nft-game/SpaceFort/tests/`
- Files NOT co-located with source code

**Naming:**
- Pattern: `{component}.test.js` or `{component}.test.ts`
- Examples: `auth.test.js`, `database.test.js`, `validation.test.js`, `protocol.test.js`

**Structure:**
```
tests/
├── auth.test.js           # Authentication system tests
├── database.test.js       # Database layer tests
├── validation.test.js     # Input validation tests
└── protocol.test.js       # Protocol implementation tests
```

## Test Structure

**Suite Organization:**
```javascript
describe('ComponentName', () => {
  let instance;

  beforeEach(() => {
    instance = new ComponentName(options);
  });

  afterEach(() => {
    instance.destroy();
  });

  describe('methodName', () => {
    it('should do something when given input', () => {
      // arrange
      const input = testData;

      // act
      const result = instance.method(input);

      // assert
      expect(result).toBe(expected);
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks for logical grouping (method-level)
- `beforeEach` / `afterEach` for setup and teardown
- One assertion (expect) per test or grouped related assertions
- Test names as readable sentences: `'returns challenge, nonce, and expiresAt'`
- Arrange-act-assert pattern (implicit, not commented)

## Mocking

**Framework:** Jest built-in mocking

**Patterns:**
- Environment variables for test mode:
  ```javascript
  process.env.AGENT_JWT_SECRET = 'test-secret-key-for-jest';
  ```
- Module mode flags:
  ```javascript
  const auth = new AgentAuth(null); // null = mock mode
  ```
- Direct property manipulation in tests:
  ```javascript
  const entry = auth.challenges.get(nonce);
  entry.expiresAt = Date.now() - 1000; // Force expiration
  ```
- Test helpers for common setup:
  ```javascript
  const VALID_ADDRESS = '0x' + 'a'.repeat(40);
  ```
- Module reloading for environment variable tests:
  ```javascript
  jest.resetModules();
  const { AgentAuth } = require('../agent/auth');
  ```

**What to Mock:**
- Database connections — use test-specific paths
- External APIs — use fixture data
- Environment configuration — set before requiring modules

**What NOT to Mock:**
- Core business logic — test the actual implementation
- Data structures — use real arrays, objects, maps
- Class instances — instantiate directly with test config

## Fixtures and Factories

**Test Data:**
```javascript
const testPlayer = {
  id: '0x' + 'a'.repeat(40),
  nfts: [],
  tokens: 500,
  upgradePoints: 50,
  experience: 100,
  prestige: 0,
  achievements: [],
  activeTasks: [],
  upgradeNFTs: [],
  isPremium: true,
  walletAddress: '0x' + 'a'.repeat(40),
  maxUnits: 50,
  maxEquipment: 200,
  nativeTokens: 0,
  lastActivity: Date.now(),
  guildId: null,
  guildRank: null,
  lastFaucetClaim: 0,
};
```

**Location:**
- Fixture data defined inline in test files (not extracted)
- Constants at top of test file for reuse across tests
- Example addresses generated with patterns: `'0x' + 'a'.repeat(40)`

## Coverage

**Requirements:** No coverage requirements observed in jest.config.js
- Not enforced via configuration
- Coverage collection available via `npm test -- --coverage`

**View Coverage:**
```bash
npm test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual class methods and functions
- Approach: Isolated, single responsibility
- Examples:
  - `createChallenge()` returns challenge object with required fields
  - `authenticate()` validates signatures and nonces
  - `_checkRateLimit()` enforces read/write limits
  - Database save/load operations
  - Equipment compatibility rules

**Integration Tests:**
- Scope: Not explicitly separated
- Approach: Multi-step workflows (e.g., authentication flow: create challenge → authenticate → verify token)
- Examples (from auth.test.js):
  - `authenticate()` returns success after valid `createChallenge()` call
  - Token refresh workflow
  - Challenge cleanup across lifecycle

**E2E Tests:**
- Framework: Not used
- Approach: Not observed in project

## Common Patterns

**Async Testing:**
```javascript
it('returns success with valid challenge flow', async () => {
  const { nonce } = auth.createChallenge(VALID_ADDRESS);
  const result = await auth.authenticate(VALID_ADDRESS, 'valid-signature-long', nonce);
  expect(result.success).toBe(true);
  expect(result).toHaveProperty('token');
});
```

**Error Testing:**
```javascript
it('throws when address is missing', () => {
  expect(() => auth.createChallenge()).toThrow('address is required');
});

it('rejects missing params', async () => {
  const result = await auth.authenticate(null, null, null);
  expect(result.success).toBe(false);
  expect(result.error).toMatch(/required/);
});
```

**State Verification:**
```javascript
it('removes expired challenges', () => {
  const { nonce } = auth.createChallenge(VALID_ADDRESS);
  auth.challenges.get(nonce).expiresAt = Date.now() - 1;
  auth._cleanup();
  expect(auth.challenges.has(nonce)).toBe(false);
});
```

**Lifecycle Testing:**
```javascript
describe('Database', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  // tests...
});
```

**Performance Testing:**
```javascript
it('saves and loads 100 players within 500ms', () => {
  const start = Date.now();
  // ... perform operation ...
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(500);
});
```

**Property-Based Testing:**
```javascript
it('tracks read and write limits independently', () => {
  for (let i = 0; i < 60; i++) {
    auth._checkRateLimit(VALID_ADDRESS, 'write');
  }
  // Write exhausted, but read should still work
  expect(auth._checkRateLimit(VALID_ADDRESS, 'read')).toBe(true);
});
```

## Test Coverage Observations

**Well-Tested Areas:**
- Authentication system (`agent/auth.js`): Challenge creation, signature verification, token lifecycle, rate limiting, nonce replay detection
- Database layer (`database/index.js`): Player persistence, unit operations, agent operations, bulk saves, JSON serialization
- Core business logic: Migrations, equipment compatibility, unit attributes

**Partially Tested Areas:**
- Validation logic (`validation.test.js`)
- Protocol implementation (`protocol.test.js`)

**Untested Areas:**
- Content pipeline (`src/workflows/content-pipeline.ts`) — no test files found
- AI generation (`src/content/ai-generator.ts`) — no test files found
- External integrations (Twitter, Linear, Typefully) — no test files found
- Image generation and visual features — no test files found

---

*Testing analysis: 2026-03-14*
