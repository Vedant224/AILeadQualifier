/**
 * Error Handling Utilities
 * 
 * Provides custom error classes and utilities for consistent
 * error handling throughout the Lead Scoring Backend API.
 */

import { ErrorCode, HttpStatus } from '../models';

/**
 * Base API error class
 * 
 * Extends the standard Error class with additional properties
 * for HTTP status codes and error codes for consistent handling.
 */
export class ApiError extends Error {
  /** HTTP status code for the error */
  public readonly statusCode: HttpStatus;
  
  /** Application-specific error code */
  public readonly errorCode: ErrorCode;
  
  /** Additional error details */
  public readonly details?: any;
  
  /** Timestamp when error occurred */
  public readonly timestamp: Date;
  
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, ApiError);
  }
}

/**
 * Validation error class
 * 
 * Specialized error for validation failures with detailed
 * information about what validation rules were violated.
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      details
    );
    this.name = 'ValidationError';
  }
}

/**
 * Business logic error class
 * 
 * Used for errors related to business rules and application
 * logic that don't fit into validation or system errors.
 */
export class BusinessLogicError extends ApiError {
  constructor(
    message: string,
    errorCode: ErrorCode,
    details?: any
  ) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      errorCode,
      details
    );
    this.name = 'BusinessLogicError';
  }
}

/**
 * External service error class
 * 
 * Used for errors when communicating with external services
 * like AI providers or other APIs.
 */
export class ExternalServiceError extends ApiError {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
    details?: any
  ) {
    super(
      message,
      statusCode,
      ErrorCode.AI_SERVICE_ERROR,
      details
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * File processing error class
 * 
 * Specialized error for file upload and processing issues
 * including CSV parsing and validation errors.
 */
export class FileProcessingError extends ApiError {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      ErrorCode.CSV_PARSING_ERROR,
      details
    );
    this.name = 'FileProcessingError';
  }
}

/**
 * Creates a standardized error response object
 * 
 * Converts any error into a consistent API response format
 * that can be safely sent to clients.
 * 
 * @param error - Error object to format
 * @param requestId - Optional request ID for tracking
 * @returns Formatted error response object
 */
export function formatErrorResponse(error: any, requestId?: string) {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return {
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp.toISOString(),
        request_id: requestId
      }
    };
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    return {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: process.env['NODE_ENV'] === 'development' 
          ? error.message 
          : 'Internal server error',
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    };
  }
  
  // Handle unknown error types
  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  };
}

/**
 * Logs error with appropriate level and context
 * 
 * Provides consistent error logging with different levels
 * based on error type and severity.
 * 
 * @param error - Error to log
 * @param context - Additional context information
 */
export function logError(error: any, context?: string) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  
  if (error instanceof ApiError) {
    // Log API errors with full details
    console.error(`${timestamp} ${contextStr}API Error:`, {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      details: error.details,
      stack: error.stack
    });
  } else if (error instanceof Error) {
    // Log standard errors
    console.error(`${timestamp} ${contextStr}Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } else {
    // Log unknown error types
    console.error(`${timestamp} ${contextStr}Unknown Error:`, error);
  }
}

/**
 * Wraps async functions with error handling
 * 
 * Provides a utility to wrap async functions and ensure
 * consistent error handling and logging.
 * 
 * @param fn - Async function to wrap
 * @param context - Context for error logging
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error;
    }
  };
}