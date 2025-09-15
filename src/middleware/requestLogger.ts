/**
 * Request Logging Middleware
 * 
 * Provides detailed request logging for debugging and monitoring.
 * Logs request details, processing time, and response status.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware factory
 * 
 * Creates a middleware function that logs request details
 * including method, path, processing time, and response status.
 * 
 * @param endpoint - Endpoint identifier for logging context
 * @returns Express middleware function
 */
export function requestLogger(endpoint: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Log incoming request
    console.log(`📥 ${timestamp} [${endpoint}] ${req.method} ${req.originalUrl}`);
    
    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`   Headers: ${JSON.stringify(req.headers, null, 2)}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body: ${JSON.stringify(req.body, null, 2)}`);
      }
    }
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(body: any) {
      const processingTime = Date.now() - startTime;
      const responseTimestamp = new Date().toISOString();
      
      // Log response details
      console.log(`📤 ${responseTimestamp} [${endpoint}] ${res.statusCode} (${processingTime}ms)`);
      
      // Log response body in development (truncated for large responses)
      if (process.env.NODE_ENV === 'development') {
        const bodyStr = JSON.stringify(body);
        const truncatedBody = bodyStr.length > 500 
          ? bodyStr.substring(0, 500) + '...[truncated]'
          : bodyStr;
        console.log(`   Response: ${truncatedBody}`);
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Error logging middleware
 * 
 * Logs errors that occur during request processing
 * with full context and stack traces.
 * 
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorLogger(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();
  
  console.error(`❌ ${timestamp} [ERROR] ${req.method} ${req.originalUrl}`);
  console.error(`   Error: ${error.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`   Stack: ${error.stack}`);
  }
  
  next(error);
}