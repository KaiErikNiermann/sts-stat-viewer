/**
 * Type-safe API Client for STS Stat Viewer
 * 
 * Uses openapi-fetch, Effect-TS, and ts-pattern for:
 * - Type-safe HTTP requests with full endpoint typing
 * - Functional error handling with Effect
 * - Exhaustive pattern matching
 */

import createClient, { type Middleware } from 'openapi-fetch';
import { Effect, Either } from 'effect';
import { match, P } from 'ts-pattern';
import type { paths, components } from './schema';

// ============================================================================
// Type Exports from Generated Schema
// ============================================================================

export type HealthResponse = components['schemas']['HealthResponse'];
export type Character = components['schemas']['Character'];
export type RunMetrics = components['schemas']['RunMetrics'];
export type CharacterStats = components['schemas']['CharacterStats'];
export type ExportData = components['schemas']['ExportData'];
export type ApiError = components['schemas']['ApiError'];

// Character IDs as literal types
export type CharacterId = 'IRONCLAD' | 'THE_SILENT' | 'DEFECT' | 'WATCHER';

// ============================================================================
// Error Types with String Literal Tags
// ============================================================================

export type NetworkError = {
  readonly _tag: 'NetworkError';
  readonly message: string;
  readonly cause?: unknown;
};

export type ApiRequestError = {
  readonly _tag: 'ApiRequestError';
  readonly error: ApiError;
  readonly status: number;
};

export type UnexpectedError = {
  readonly _tag: 'UnexpectedError';
  readonly message: string;
  readonly cause?: unknown;
};

export type ApiClientError = NetworkError | ApiRequestError | UnexpectedError;

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

const loggingMiddleware: Middleware = {
  async onRequest({ request }) {
    console.debug(`[API] ${request.method} ${request.url}`);
    return request;
  },
  async onResponse({ response }) {
    console.debug(`[API] ${response.status} ${response.url}`);
    return response;
  },
};

const client = createClient<paths>({ baseUrl: API_BASE_URL });
client.use(loggingMiddleware);

// ============================================================================
// Effect-TS API Wrapper
// ============================================================================

export const effectApi = {
  /**
   * Health check endpoint
   */
  healthCheck: () =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/health');
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned from health check');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError('Health check failed', error),
    }),

  /**
   * Get all characters
   */
  getCharacters: () =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/characters');
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError('Failed to fetch characters', error),
    }),

  /**
   * Get all runs with optional filters
   */
  getRuns: (params?: { character?: string; victories_only?: boolean; min_ascension?: number }) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/runs', {
          params: { query: params },
        });
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError('Failed to fetch runs', error),
    }),

  /**
   * Get runs for a specific character
   */
  getCharacterRuns: (character: CharacterId) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/runs/{character}', {
          params: { path: { character } },
        });
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError(`Failed to fetch ${character} runs`, error),
    }),

  /**
   * Get stats for all characters
   */
  getStats: () =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/stats');
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError('Failed to fetch stats', error),
    }),

  /**
   * Get stats for a specific character
   */
  getCharacterStats: (character: CharacterId) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/stats/{character}', {
          params: { path: { character } },
        });
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError(`Failed to fetch ${character} stats`, error),
    }),

  /**
   * Get complete export data
   */
  getExport: () =>
    Effect.tryPromise({
      try: async () => {
        const { data, error, response } = await client.GET('/api/export');
        if (error) throw apiRequestError(error as ApiError, response.status);
        if (!data) throw unexpectedError('No data returned');
        return data;
      },
      catch: (error) =>
        error instanceof Object && '_tag' in error
          ? (error as ApiClientError)
          : networkError('Failed to fetch export data', error),
    }),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run an Effect and return Either<Error, Success>
 */
export async function runEffect<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<Either.Either<A, E>> {
  return Effect.runPromise(Effect.either(effect));
}

/**
 * Format API error for display
 */
export function formatApiError(error: ApiClientError): string {
  return match(error)
    .with({ _tag: 'NetworkError' }, (e) => `Network error: ${e.message}`)
    .with({ _tag: 'ApiRequestError' }, (e) => `API error: ${e.error.error}`)
    .with({ _tag: 'UnexpectedError' }, (e) => `Unexpected error: ${e.message}`)
    .exhaustive();
}

/**
 * Get character display color
 */
export function getCharacterColor(character: string): string {
  return match(character.toUpperCase())
    .with('IRONCLAD', () => '#c62828')
    .with('THE_SILENT', () => '#2e7d32')
    .with('DEFECT', () => '#1565c0')
    .with('WATCHER', () => '#6a1b9a')
    .otherwise(() => '#64748b');
}

/**
 * Get character display name
 */
export function getCharacterDisplayName(character: string): string {
  return match(character.toUpperCase())
    .with('IRONCLAD', () => 'Ironclad')
    .with('THE_SILENT', () => 'Silent')
    .with('DEFECT', () => 'Defect')
    .with('WATCHER', () => 'Watcher')
    .otherwise(() => character);
}
