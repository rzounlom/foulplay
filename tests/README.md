# Test Suite

This directory contains unit and integration tests for the FoulPlay application.

## Test Structure

```
tests/
├── unit/              # Unit tests for pure functions
│   ├── game/          # Game logic tests
│   └── rooms/         # Room utility tests
├── integration/        # Integration tests for API routes
│   └── api/           # API route tests
├── helpers/           # Test helpers and mocks
└── README.md          # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/game/engine.test.ts
```

## Test Categories

### Unit Tests

Unit tests test pure functions in isolation without external dependencies:

- **Game Engine** (`tests/unit/game/engine.test.ts`)
  - Deck generation
  - Card drawing
  - Game state initialization
  - Turn advancement

- **Approval Logic** (`tests/unit/game/approval.test.ts`)
  - Approval threshold calculation
  - Submission resolution logic
  - Vote counting

- **Room Utils** (`tests/unit/rooms/utils.test.ts`)
  - Room code generation

### Integration Tests

Integration tests test API routes with mocked dependencies:

- **Room API** (`tests/integration/api/rooms.test.ts`)
  - Room creation
  - Joining rooms
  - Room settings updates

- **Game API** (`tests/integration/api/game.test.ts`)
  - Starting games
  - Drawing cards
  - Submitting cards
  - Voting
  - Fetching hand and submissions

## Mocking

Tests use mocks for:
- Database (Prisma)
- Authentication (Clerk)
- Real-time messaging (Ably)

Mock data is defined in `tests/helpers/mocks.ts`.

## Writing New Tests

When adding new functionality:

1. **Unit tests** should be added for any pure functions (game logic, utilities)
2. **Integration tests** should be added for new API routes
3. **Component tests** can be added for React components using React Testing Library

### Example Unit Test

```typescript
import { myFunction } from "@/lib/my-module";

describe("myFunction", () => {
  it("should do something", () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Example Integration Test

```typescript
import { POST as myRoute } from "@/app/api/my-route/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth/clerk");
jest.mock("@/lib/db/prisma");

describe("POST /api/my-route", () => {
  it("should handle request", async () => {
    const request = new NextRequest("http://localhost:3000/api/my-route", {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });

    const response = await myRoute(request);
    expect(response.status).toBe(200);
  });
});
```

## Coverage Goals

- **Unit tests**: Aim for 80%+ coverage of game logic and utilities
- **Integration tests**: Cover all API routes and error cases
- **Component tests**: Test critical user interactions

## Notes

- Tests use Jest with React Testing Library for component tests
- Database and external services are mocked to keep tests fast and isolated
- Tests should be deterministic and not depend on external state
