/**
 * Type-safe API Client with openapi-fetch, Effect-TS, and ts-pattern
 * 
 * This module provides:
 * - openapi-fetch based type-safe HTTP client with full endpoint typing
 * - Effect-TS integration for functional error handling
 * - ts-pattern for exhaustive pattern matching
 * - Strict string literal types for discriminated unions
 */

import createClient, { type Middleware } from 'openapi-fetch';
import { Effect, Either } from 'effect';
import { match, P } from 'ts-pattern';
import type { paths, components } from './schema';

// ============================================================================
// Type Exports from Generated Schema
// ============================================================================

export type HealthResponse = components['schemas']['HealthResponse'];
export type ApiError = components['schemas']['ApiError'];

// Health status as string literal type for exhaustive matching
export type HealthStatus = HealthResponse['status'];

// ============================================================================
// Error Types with String Literal Tags for Pattern Matching
// ============================================================================

/**
 * Network-level error (connection failed, timeout, etc.)
 */
export type NetworkError = {
  readonly _tag: 'NetworkError';
  readonly message: string;
  readonly cause?: unknown;
};

/**
 * API-level error (4xx, 5xx responses with error body)
 */
export type ApiRequestError = {
  readonly _tag: 'ApiRequestError';
  readonly error: ApiError;
  readonly status: number;
};

/**
 * Unexpected error (no data returned, parsing failed, etc.)
 */
export type UnexpectedError = {
  readonly _tag: 'UnexpectedError';
  readonly message: string;
  readonly cause?: unknown;
};

/**
 * Union of all possible API client errors
 */
export type ApiClientError = NetworkError | ApiRequestError | UnexpectedError;

// Error tag literals for exhaustive matching
export type ApiClientErrorTag = ApiClientError['_tag'];

// ============================================================================
// Error Constructors
// ============================================================================

export const networkError = (message: string, cause?: unknown): NetworkError => ({
  _tag: 'NetworkError' as const,
  message,
  cause,
});

export const apiRequestError = (error: ApiError, status: number): ApiRequestError => ({
  _tag: 'ApiRequestError' as const,
  error,
  status,
});

export const unexpectedError = (message: string, cause?: unknown): UnexpectedError => ({
  _tag: 'UnexpectedError' as const,
  message,
  cause,
});

// ============================================================================
// API Client Configuration
// ============================================================================

const API_BASE_URL = 'http://127.0.0.1:3030';

/**
 * Logging middleware for debugging API calls
 */
const loggingMiddleware: Middleware = {
  async onRequest({ request }) {
    console.debug(`[API] ${request.method} ${request.url}`);
    return request;
  },
  async onResponse({ response }) {
    console.debug(`[API] Response: ${response.status} ${response.statusText}`);
    return response;
  },
};

/**
 * Create the openapi-fetch client with full type safety
 */
export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

// Register middleware (can be disabled in production)
if (import.meta.env.DEV) {
  apiClient.use(loggingMiddleware);
}

// ============================================================================
// Response Processing with ts-pattern
// ============================================================================

type ApiResponse<TData, TError> = {
  data?: TData;
  error?: TError;
  response: Response;
};

/**
 * Process an openapi-fetch response
 * Uses explicit type guards for strict type narrowing
 */
const processResponse = <TData, TError>(
  result: ApiResponse<TData, TError>,
  errorContext: string
): TData => {
  const { data, error, response } = result;

  // Check for error first (API returned an error body)
  if (error !== undefined && error !== null) {
    throw apiRequestError(error as unknown as ApiError, response.status);
  }

  // Check for non-OK response
  if (!response.ok) {
    throw networkError(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Check for missing data
  if (data === undefined || data === null) {
    throw unexpectedError(`No data returned from ${errorContext}`);
  }

  return data;
};

/**
 * Wrap fetch errors using ts-pattern
 */
const wrapFetchError = (error: unknown, context: string): ApiClientError =>
  match(error)
    .with({ _tag: 'NetworkError' }, (e) => e as NetworkError)
    .with({ _tag: 'ApiRequestError' }, (e) => e as ApiRequestError)
    .with({ _tag: 'UnexpectedError' }, (e) => e as UnexpectedError)
    .with(P.instanceOf(TypeError), (e) =>
      match(e.message)
        .when((msg) => msg.includes('fetch'), () => networkError('Network request failed', e))
        .otherwise(() => unexpectedError(`TypeError during ${context}`, e))
    )
    .otherwise(() => unexpectedError(`Unexpected error during ${context}`, error));

// ============================================================================
// Effect-TS API Wrappers
// ============================================================================

/**
 * Effect-wrapped API methods using openapi-fetch
 */
export const effectApi = {
  /**
   * Health check - GET /api/health
   * Returns health status with version info
   */
  healthCheck: (): Effect.Effect<HealthResponse, ApiClientError> =>
    Effect.tryPromise({
      try: async () => {
        const result = await apiClient.GET('/api/health');
        return processResponse(result, 'health check');
      },
      catch: (error) => wrapFetchError(error, 'health check'),
    }),
} as const;

// ============================================================================
// Direct API Methods (without Effect wrapper)
// ============================================================================

/**
 * Direct API methods returning Either for simpler use cases
 */
export const api = {
  /**
   * Health check - GET /api/health
   */
  healthCheck: async (): Promise<Either.Either<HealthResponse, ApiClientError>> => {
    try {
      const result = await apiClient.GET('/api/health');
      return Either.right(processResponse(result, 'health check'));
    } catch (error) {
      return Either.left(wrapFetchError(error, 'health check'));
    }
  },
} as const;

// ============================================================================
// Effect Utilities
// ============================================================================

/**
 * Run an Effect and convert to Promise<Either>
 * Useful for integrating with Svelte's reactive system
 */
export const runEffect = <A, E>(
  effect: Effect.Effect<A, E>
): Promise<Either.Either<A, E>> => Effect.runPromise(Effect.either(effect));

// ============================================================================
// Pattern Matching Utilities
// ============================================================================

/**
 * Pattern match on API errors using ts-pattern
 * Provides exhaustive matching with string literal tags
 */
export const matchApiError = <T>(
  error: ApiClientError,
  handlers: {
    readonly onNetworkError: (e: NetworkError) => T;
    readonly onApiRequestError: (e: ApiRequestError) => T;
    readonly onUnexpectedError: (e: UnexpectedError) => T;
  }
): T =>
  match(error)
    .with({ _tag: 'NetworkError' }, handlers.onNetworkError)
    .with({ _tag: 'ApiRequestError' }, handlers.onApiRequestError)
    .with({ _tag: 'UnexpectedError' }, handlers.onUnexpectedError)
    .exhaustive();

/**
 * Pattern match on health status using ts-pattern
 */
export const matchHealthStatus = <T>(
  status: HealthStatus,
  handlers: {
    readonly onHealthy: () => T;
    readonly onUnhealthy: () => T;
  }
): T =>
  match(status)
    .with('healthy', handlers.onHealthy)
    .with('unhealthy', handlers.onUnhealthy)
    .exhaustive();

/**
 * Format API error to user-friendly message using ts-pattern
 */
export const formatApiError = (error: ApiClientError): string =>
  match(error)
    .with({ _tag: 'NetworkError' }, ({ message }) => `Network error: ${message}`)
    .with({ _tag: 'ApiRequestError' }, ({ error: { error: msg, code }, status }) =>
      `API error (${status}): ${msg} [${code}]`
    )
    .with({ _tag: 'UnexpectedError' }, ({ message }) => `Unexpected error: ${message}`)
    .exhaustive();

/**
 * Check if error is retryable using ts-pattern
 */
export const isRetryableError = (error: ApiClientError): boolean =>
  match(error)
    .with({ _tag: 'NetworkError' }, () => true)
    .with({ _tag: 'ApiRequestError', status: P.when((s) => s >= 500) }, () => true)
    .with({ _tag: 'ApiRequestError' }, () => false)
    .with({ _tag: 'UnexpectedError' }, () => false)
    .exhaustive();

// ============================================================================
// Type Re-exports
// ============================================================================

export type { paths, components };
