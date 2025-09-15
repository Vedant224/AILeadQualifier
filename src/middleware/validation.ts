/**
 * Validation Middleware
 * 
 * Provides Express middleware functions for request validation
 * including content-type checking and request size limits.
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError, formatErrorResponse } from '../utils/errors';
import { HttpStatus } from '../models';

/**
 * Content-Type validation middleware
 * 
 * Ensures that requests have the expected Content-Type header.
 * Useful for endpoints that expect specific content types like JSON.
 * 
 * @param expectedType - Expected Content-Type (e.g., 'application/json')
 * @returns Express middleware function
 */
export function validateContentType(expectedType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    // Skip validation for GET requests (no body expected)
    if (req.method === 'GET') {
      return next();
    }
    
    // Check if Content-Type matches expected type
    if (!contentType || !contentType.includes(expectedType)) {
      const error = new ValidationError(
        `Invalid Content-Type. Expected '${expectedType}' but received '${contentType || 'none'}'`,
        {
          expected: expectedType,
          received: contentType || null,
          method: req.method,
          path: req.path
        }
      );
      
      return res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
    }
    
    next();
  };
}

/**
 * Request body size validation middleware
 * 
 * Validates that request body size is within acceptable limits.
 * Provides early validation before processing large payloads.
 * 
 * @param maxSizeBytes - Maximum allowed body size in bytes
 * @returns Express middleware function
 */
export function validateBodySize(maxSizeBytes: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      const error = new ValidationError(
        `Request body too large. Maximum size is ${maxSizeBytes} bytes`,
        {
          max_size_bytes: maxSizeBytes,
          received_size_bytes: parseInt(contentLength),
          path: req.path
        }
      );
      
      return res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
    }
    
    next();
  };
}

/**
 * JSON parsing error handler middleware
 * 
 * Catches JSON parsing errors and returns user-friendly error messages
 * instead of the default Express JSON parsing error.
 * 
 * @param error - Error object from JSON parsing
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function handleJsonParsingError(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof SyntaxError && 'body' in error) {
    const validationError = new ValidationError(
      'Invalid JSON format in request body',
      {
        error_type: 'json_parsing',
        original_error: error.message,
        path: req.path
      }
    );
    
    return res.status(HttpStatus.BAD_REQUEST).json(
      formatErrorResponse(validationError)
    );
  }
  
  next(error);
}

/**
 * Rate limiting middleware (basic implementation)
 * 
 * Provides basic rate limiting to prevent abuse.
 * In production, consider using a more robust solution like redis-based rate limiting.
 * 
 * @param maxRequests - Maximum requests per time window
 * @param windowMs - Time window in milliseconds
 * @returns Express middleware function
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    // Get or create client record
    let clientRecord = requests.get(clientId);
    if (!clientRecord || now > clientRecord.resetTime) {
      clientRecord = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(clientId, clientRecord);
    }
    
    // Check rate limit
    if (clientRecord.count >= maxRequests) {
      const error = new ValidationError(
        'Rate limit exceeded. Please try again later.',
        {
          max_requests: maxRequests,
          window_ms: windowMs,
          reset_time: new Date(clientRecord.resetTime).toISOString()
        }
      );
      
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json(
        formatErrorResponse(error)
      );
    }
    
    // Increment request count
    clientRecord.count++;
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString()
    });
    
    next();
  };
}