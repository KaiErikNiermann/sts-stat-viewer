/**
 * API Client Tests
 * 
 * Tests for the type-safe API client with Effect-TS, openapi-fetch, and ts-pattern
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import {
  networkError,
  apiRequestError,
  unexpectedError,
  matchApiError,
  matchHealthStatus,
  formatApiError,
  isRetryableError,
  type NetworkError,
  type ApiClientError,
  type HealthStatus,
} from './client';

describe('API Client Error Constructors', () => {
  describe('networkError', () => {
    it('should create a NetworkError with message', () => {
      const error = networkError('Connection failed');
      expect(error._tag).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.cause).toBeUndefined();
    });

    it('should create a NetworkError with cause', () => {
      const cause = new Error('underlying error');
      const error = networkError('Connection failed', cause);
      expect(error.cause).toBe(cause);
    });

    it('should have readonly properties', () => {
      const error: NetworkError = networkError('test');
      // TypeScript will enforce readonly at compile time
      expect(error._tag).toBe('NetworkError');
    });
  });

  describe('apiRequestError', () => {
    it('should create an ApiRequestError with error details and status', () => {
      const apiError = {
        error: 'Not found',
        code: 'NOT_FOUND',
      };
      const error = apiRequestError(apiError, 404);
      expect(error._tag).toBe('ApiRequestError');
      expect(error.error).toEqual(apiError);
      expect(error.status).toBe(404);
    });
  });

  describe('unexpectedError', () => {
    it('should create an UnexpectedError', () => {
      const error = unexpectedError('Something went wrong');
      expect(error._tag).toBe('UnexpectedError');
      expect(error.message).toBe('Something went wrong');
    });
  });
});

describe('matchApiError (ts-pattern)', () => {
  it('should match NetworkError', () => {
    const error: ApiClientError = networkError('Network failed');
    const result = matchApiError(error, {
      onNetworkError: (e) => `Network: ${e.message}`,
      onApiRequestError: (e) => `API: ${e.error.error}`,
      onUnexpectedError: (e) => `Unexpected: ${e.message}`,
    });
    expect(result).toBe('Network: Network failed');
  });

  it('should match ApiRequestError', () => {
    const error: ApiClientError = apiRequestError(
      { error: 'Bad request', code: 'BAD_REQUEST' },
      400
    );
    const result = matchApiError(error, {
      onNetworkError: (e) => `Network: ${e.message}`,
      onApiRequestError: (e) => `API: ${e.error.error} (${e.status})`,
      onUnexpectedError: (e) => `Unexpected: ${e.message}`,
    });
    expect(result).toBe('API: Bad request (400)');
  });

  it('should match UnexpectedError', () => {
    const error: ApiClientError = unexpectedError('Unknown error');
    const result = matchApiError(error, {
      onNetworkError: (e) => `Network: ${e.message}`,
      onApiRequestError: (e) => `API: ${e.error.error}`,
      onUnexpectedError: (e) => `Unexpected: ${e.message}`,
    });
    expect(result).toBe('Unexpected: Unknown error');
  });
});

describe('matchHealthStatus (ts-pattern)', () => {
  it('should match healthy status', () => {
    const status: HealthStatus = 'healthy';
    const result = matchHealthStatus(status, {
      onHealthy: () => 'System is healthy',
      onUnhealthy: () => 'System is down',
    });
    expect(result).toBe('System is healthy');
  });

  it('should match unhealthy status', () => {
    const status: HealthStatus = 'unhealthy';
    const result = matchHealthStatus(status, {
      onHealthy: () => 'System is healthy',
      onUnhealthy: () => 'System is down',
    });
    expect(result).toBe('System is down');
  });
});

describe('formatApiError', () => {
  it('should format NetworkError', () => {
    const error = networkError('Connection timeout');
    expect(formatApiError(error)).toBe('Network error: Connection timeout');
  });

  it('should format ApiRequestError', () => {
    const error = apiRequestError(
      { error: 'Invalid input', code: 'VALIDATION_ERROR', details: 'Name required' },
      422
    );
    expect(formatApiError(error)).toBe('API error (422): Invalid input [VALIDATION_ERROR]');
  });

  it('should format UnexpectedError', () => {
    const error = unexpectedError('Something broke');
    expect(formatApiError(error)).toBe('Unexpected error: Something broke');
  });
});

describe('isRetryableError', () => {
  it('should return true for NetworkError', () => {
    expect(isRetryableError(networkError('Connection failed'))).toBe(true);
  });

  it('should return true for 5xx ApiRequestError', () => {
    expect(
      isRetryableError(apiRequestError({ error: 'Server error', code: 'INTERNAL' }, 500))
    ).toBe(true);
    expect(
      isRetryableError(apiRequestError({ error: 'Gateway timeout', code: 'TIMEOUT' }, 504))
    ).toBe(true);
  });

  it('should return false for 4xx ApiRequestError', () => {
    expect(
      isRetryableError(apiRequestError({ error: 'Not found', code: 'NOT_FOUND' }, 404))
    ).toBe(false);
    expect(
      isRetryableError(apiRequestError({ error: 'Forbidden', code: 'FORBIDDEN' }, 403))
    ).toBe(false);
  });

  it('should return false for UnexpectedError', () => {
    expect(isRetryableError(unexpectedError('Parse error'))).toBe(false);
  });
});

describe('Effect Integration', () => {
  it('Either.isRight should correctly identify success', () => {
    const success = Either.right({ message: 'Hello', timestamp: new Date().toISOString() });
    expect(Either.isRight(success)).toBe(true);
    expect(Either.isLeft(success)).toBe(false);
  });

  it('Either.isLeft should correctly identify failure', () => {
    const failure = Either.left(networkError('Failed'));
    expect(Either.isLeft(failure)).toBe(true);
    expect(Either.isRight(failure)).toBe(false);
  });

  it('should extract value from Either.right', () => {
    const success = Either.right({ value: 42 });
    const extracted = Either.getOrNull(success);
    expect(extracted).toEqual({ value: 42 });
  });

  it('should return null from Either.left with getOrNull', () => {
    const failure = Either.left(networkError('Failed'));
    const extracted = Either.getOrNull(failure);
    expect(extracted).toBeNull();
  });
});
