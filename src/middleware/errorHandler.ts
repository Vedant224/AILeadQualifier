/**
 * Global Error Handling Middleware
 * 
 * Provides comprehensive error handling for the entire application
 * with proper HTTP status codes, logging, and client-safe responses.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, formatErrorResponse, logError } from '../utils/errors';
import { HttpStatus, ErrorCode } from '../models';

/**
 * Global error handling middleware
 * 
 * Catches all unhandled errors and formats them into consistent
 * API responses with appropriate HTTP status codes.
 * 
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function globalErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID for error tracking
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log the error with context
  logError(error, `global_error_handler_${req.method}_${req.path}`);
  
  // Handle different error types
  if (error instanceof ApiError) {
    // Custom API errors with proper status codes
    res.status(error.statusCode).json(
      formatErrorResponse(error, requestId)
    );
    return;
  }
  
  // Handle validation errors from express-validator or joi
  if (error.name === 'ValidationError' || error.isJoi) {
    const validationError = new ApiError(
      'Request validation failed',
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      {
        validation_errors: error.details || error.errors,
        field_errors: extractFieldErrors(error)
      }
    );
    
    res.status(HttpStatus.BAD_REQUEST).json(
      formatErrorResponse(validationError, requestId)
    );
    return;
  }
  
  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    const jsonError = new ApiError(
      'Invalid JSON format in request body',
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_FORMAT,
      {
        error_type: 'json_parsing',
        position: (error as any).body
      }
    );
    
    res.status(HttpStatus.BAD_REQUEST).json(
      formatErrorResponse(jsonError, requestId)
    );
    return;
  }
  
  // Handle MongoDB/Database errors (if using database)
  if (error.name === 'MongoError' || error.name === 'CastError') {
    const dbError = new ApiError(
      'Database operation failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_ERROR,
      {
        error_type: 'database_error',
        operation: error.operation || 'unknown'
      }
    );
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(dbError, requestId)
    );
    return;
  }
  
  // Handle rate limiting errors
  if (error.status === 429 || error.message?.includes('rate limit')) {
    const rateLimitError = new ApiError(
      'Rate limit exceeded. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
      ErrorCode.VALIDATION_ERROR,
      {
        error_type: 'rate_limit',
        retry_after: error.retryAfter || '60 seconds'
      }
    );
    
    res.status(HttpStatus.TOO_MANY_REQUESTS).json(
      formatErrorResponse(rateLimitError, requestId)
    );
    return;
  }
  
  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    const timeoutError = new ApiError(
      'Request timeout. Please try again.',
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.AI_SERVICE_UNAVAILABLE,
      {
        error_type: 'timeout',
        timeout_duration: error.timeout || 'unknown'
      }
    );
    
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
      formatErrorResponse(timeoutError, requestId)
    );
    return;
  }
  
  // Handle standard HTTP errors
  if (error.status || error.statusCode) {
    const httpError = new ApiError(
      error.message || 'HTTP error occurred',
      error.status || error.statusCode,
      ErrorCode.INTERNAL_ERROR,
      {
        error_type: 'http_error',
        original_status: error.status || error.statusCode
      }
    );
    
    res.status(error.status || error.statusCode).json(
      formatErrorResponse(httpError, requestId)
    );
    return;
  }
  
  // Handle unknown errors (fallback)
  const unknownError = new ApiError(
    process.env.NODE_ENV === 'development' 
      ? error.message || 'Unknown error occurred'
      : 'Internal server error',
    HttpStatus.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_ERROR,
    {
      error_type: 'unknown_error',
      error_name: error.name,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  );
  
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
    formatErrorResponse(unknownError, requestId)
  );
}

/**
 * 404 Not Found handler
 * 
 * Handles requests to undefined routes with consistent error format.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const notFoundError = new ApiError(
    `Route ${req.method} ${req.originalUrl} not found`,
    HttpStatus.NOT_FOUND,
    ErrorCode.NOT_FOUND,
    {
      method: req.method,
      path: req.originalUrl,
      available_endpoints: [
        'GET /health',
        'POST /offer',
        'GET /offer',
        'POST /leads/upload',
        'GET /leads',
        'POST /score',
        'GET /score/status',
        'GET /results',
        'GET /results/export'
      ]
    }
  );
  
  next(notFoundError);
}

/**
 * Request timeout handler
 * 
 * Handles requests that exceed the configured timeout limit.
 * 
 * @param timeout - Timeout duration in milliseconds
 * @returns Express middleware function
 */
export function timeoutHandler(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const timeoutError = new ApiError(
          `Request timeout after ${timeout}ms`,
          HttpStatus.SERVICE_UNAVAILABLE,
          ErrorCode.AI_SERVICE_UNAVAILABLE,
          {
            error_type: 'request_timeout',
            timeout_ms: timeout,
            path: req.path
          }
        );
        
        next(timeoutError);
      }
    }, timeout);
    
    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    next();
  };
}

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch and forward errors
 * to the global error handler.
 * 
 * @param fn - Async route handler function
 * @returns Wrapped route handler
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Extracts field-specific errors from validation error objects
 * 
 * @param error - Validation error object
 * @returns Object with field-specific error messages
 */
function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  if (error.details) {
    // Joi validation errors
    error.details.forEach((detail: any) => {
      const field = detail.path?.join('.') || 'unknown';
      fieldErrors[field] = detail.message;
    });
  } else if (error.errors) {
    // Express-validator or mongoose errors
    if (Array.isArray(error.errors)) {
      error.errors.forEach((err: any) => {
        fieldErrors[err.param || err.path || 'unknown'] = err.msg || err.message;
      });
    } else {
      Object.keys(error.errors).forEach(field => {
        fieldErrors[field] = error.errors[field].message;
      });
    }
  }
  
  return fieldErrors;
}

/**
 * Error response sanitizer
 * 
 * Removes sensitive information from error responses
 * in production environments.
 * 
 * @param error - Error object to sanitize
 * @returns Sanitized error object
 */
export function sanitizeError(error: any): any {
  if (process.env.NODE_ENV === 'production') {
    // Remove sensitive fields in production
    const sanitized = { ...error };
    delete sanitized.stack;
    delete sanitized.config;
    delete sanitized.request;
    delete sanitized.response;
    
    // Remove internal paths and system information
    if (sanitized.details) {
      delete sanitized.details.stack;
      delete sanitized.details.config;
    }
    
    return sanitized;
  }
  
  return error;
}