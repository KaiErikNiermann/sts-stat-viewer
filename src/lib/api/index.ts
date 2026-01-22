/**
 * API module exports
 * 
 * Re-exports from the client module for convenient importing:
 * - API client (openapi-fetch based)
 * - Effect-TS wrapped API methods
 * - Direct API methods returning Either
 * - Error constructors and pattern matching utilities
 * - Type exports
 */

// Client and API methods
export {
  apiClient,
  effectApi,
  api,
  runEffect,
} from './client';

// Error constructors
export {
  networkError,
  apiRequestError,
  unexpectedError,
} from './client';

// Pattern matching utilities (ts-pattern based)
export {
  matchApiError,
  matchHealthStatus,
  formatApiError,
  isRetryableError,
} from './client';

// Type exports
export type {
  NetworkError,
  ApiRequestError,
  UnexpectedError,
  ApiClientError,
  ApiClientErrorTag,
  HealthStatus,
  paths,
  components,
  HealthResponse,
  GreetRequest,
  GreetResponse,
  ApiError,
} from './client';
