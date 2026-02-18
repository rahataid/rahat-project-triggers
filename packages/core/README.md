# @lib/core

Core types and utilities for the Rahat Triggers system.

## Overview

This package provides the foundational types and patterns for building observation adapters and handling data from various sources (DHM, GFH, GLOFAS, etc.).

## Key Features

### 🎯 Result Type - Railway Oriented Programming

A type-safe way to handle success and error cases without exceptions.

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };
```

### 🚀 Functional Composition (No if-else needed!)

```typescript
async execute(params: Params): Promise<Result<Output>> {
  return chainAsync(
    this.fetch(params),
    (rawData) => chainAsync(
      this.aggregate(rawData),
      (observations) => this.transform(observations)
    )
  );
}
```

### 🛡️ Type-Safe Error Handling

All operations return `Result<T>`, forcing you to handle errors explicitly.

## Quick Start

### Installation

This package is part of the monorepo workspace. It's automatically available as `@lib/core`.

### Basic Usage

```typescript
import { Result, Ok, Err, chainAsync } from '@lib/core';

// Create results
const success = Ok({ name: 'John' });
const failure = Err('User not found');

// Chain operations
const result = await chainAsync(fetchUser(userId), (user) =>
  validateUser(user),
);
```

## API Reference

### Core Types

#### `Result<T>`

Discriminated union representing success or failure.

#### `Indicator`

Standard format for observation data.

#### `ObservationAdapter<TParams>`

Interface for implementing data source adapters.

### Helper Functions

#### Creating Results

```typescript
Ok<T>(data: T): Result<T>
Err<T>(error: string, details?: unknown): Result<T>
```

#### Functional Composition

```typescript
// Chain Results (if first fails, stop)
chain<T, U>(result: Result<T>, fn: (data: T) => Result<U>): Result<U>
chainAsync<T, U>(result: Result<T>, fn: (data: T) => Promise<Result<U>>): Promise<Result<U>>

// Transform data inside Result
map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U>
mapAsync<T, U>(result: Result<T>, fn: (data: T) => Promise<U>): Promise<Result<U>>

// Wrap try-catch blocks
tryCatch<T>(fn: () => T): Result<T>
tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>>
```

#### Type Guards

```typescript
isErr<T>(result: Result<T>): result is { success: false; error: string }
isOk<T>(result: Result<T>): result is { success: true; data: T }
```

## Patterns

### The Adapter Pattern

All data source adapters implement the `ObservationAdapter` interface:

```typescript
interface ObservationAdapter<TParams> {
  fetch(params: TParams): Promise<Result<unknown>>;
  aggregate(rawData: unknown): Result<unknown>;
  transform(aggregatedData: unknown): Result<Indicator[]>;
  execute(params: TParams): Promise<Result<Indicator[]>>;
}
```

### Example Adapter

```typescript
@Injectable()
export class DhmAdapter implements ObservationAdapter<DhmFetchParams> {
  async fetch(params: DhmFetchParams): Promise<Result<any>> {
    return tryCatchAsync(async () => {
      const responses = await Promise.all(
        params.stationIds.map((id) =>
          this.httpService.axiosRef.get(`https://dhm.gov.np/station/${id}`),
        ),
      );
      return responses.map((r) => r.data);
    });
  }

  aggregate(rawData: unknown): Result<DhmObservation[]> {
    return tryCatch(() => {
      const htmlPages = rawData as string[];
      return htmlPages.map((html) => this.parseHtml(html));
    });
  }

  transform(aggregatedData: unknown): Result<Indicator[]> {
    const observations = aggregatedData as DhmObservation[];
    const indicators = observations.map((obs) => this.toIndicator(obs));
    return Ok(indicators);
  }

  async execute(params: DhmFetchParams): Promise<Result<Indicator[]>> {
    return chainAsync(this.fetch(params), (rawData) =>
      chainAsync(this.aggregate(rawData), (observations) =>
        this.transform(observations),
      ),
    );
  }
}
```

## Documentation

- **[RESULT_PATTERN.md](./RESULT_PATTERN.md)** - Comprehensive guide to the Result pattern and best practices
- **[EXAMPLES.md](./EXAMPLES.md)** - Real-world examples and migration guide

## Why This Pattern?

### ✅ Benefits

1. **Type Safety**: Errors are part of the type system
2. **No Exceptions**: Explicit error handling instead of try-catch everywhere
3. **Composability**: Chain operations elegantly with `chainAsync`
4. **Clean Code**: Declarative style, no nested if-else
5. **Testability**: Easy to test both success and error paths

### 📚 Inspiration

This pattern is inspired by:

- Rust's `Result<T, E>` type
- Railway Oriented Programming (F#)
- Functional programming error handling patterns

## Contributing

When adding new types or utilities:

1. Keep them generic and reusable
2. Add comprehensive JSDoc comments
3. Update this README with examples
4. Add tests if applicable

## License

Part of the Rahat Triggers project.
