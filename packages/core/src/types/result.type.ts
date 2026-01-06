import { ExecutionContext } from './health.type';

export type Result<T> =
  | { success: true; data: T; executionContext?: ExecutionContext }
  | {
      success: false;
      error: string;
      details?: unknown;
      executionContext?: ExecutionContext;
    };

export function Ok<T>(data: T, executionContext?: ExecutionContext): Result<T> {
  return { success: true, data, executionContext };
}

export function Err<T>(
  error: string,
  details?: unknown,
  executionContext?: ExecutionContext,
): Result<T> {
  return { success: false, error, details, executionContext };
}

export function isErr<T>(result: Result<T>): result is {
  success: false;
  error: string;
  details?: unknown;
  executionContext?: ExecutionContext;
} {
  return !result.success;
}

export function isOk<T>(
  result: Result<T>,
): result is { success: true; data: T; executionContext?: ExecutionContext } {
  return result.success;
}

export function chain<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>,
): Result<U> {
  if (!result.success) {
    return result;
  }
  const nextResult = fn(result.data);
  if (nextResult.success && result.executionContext) {
    return {
      ...nextResult,
      executionContext: nextResult.executionContext || result.executionContext,
    };
  }
  return nextResult;
}

export async function chainAsync<T, U>(
  result: Result<T> | Promise<Result<T>>,
  fn: (
    data: T,
    executionContext?: ExecutionContext,
  ) => Promise<Result<U>> | Result<U>,
): Promise<Result<U>> {
  const resolvedResult = await result;
  if (!resolvedResult.success) {
    return resolvedResult;
  }

  const nextResult = await fn(
    resolvedResult.data,
    resolvedResult.executionContext,
  );
  if (nextResult.success && resolvedResult.executionContext) {
    return {
      ...nextResult,
      executionContext:
        nextResult.executionContext || resolvedResult.executionContext,
    };
  }
  return nextResult;
}

export function map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (!result.success) {
    return result;
  }
  return Ok(fn(result.data), result.executionContext);
}

export async function mapAsync<T, U>(
  result: Result<T> | Promise<Result<T>>,
  fn: (data: T) => Promise<U> | U,
): Promise<Result<U>> {
  const resolvedResult = await result;
  if (!resolvedResult.success) {
    return resolvedResult;
  }
  const mappedData = await fn(resolvedResult.data);
  return Ok(mappedData, resolvedResult.executionContext);
}

/**
 * Execute a function with Result - catches exceptions and returns Result
 */
export function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return Ok(fn());
  } catch (error: any) {
    return Err(error instanceof Error ? error.message : 'Unknown error', error);
  }
}

/**
 * Async version of tryCatch
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T>> {
  try {
    return Ok(await fn());
  } catch (error: any) {
    return Err(error instanceof Error ? error.message : 'Unknown error', error);
  }
}
