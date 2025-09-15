/**
 * API Response Models and Interfaces
 * 
 * Defines the structure for API responses, error handling,
 * and common data transfer objects used across endpoints.
 */

/**
 * Standard API response wrapper
 * 
 * This interface provides a consistent structure for all
 * successful API responses with optional metadata.
 */
export interface ApiResponse<T = any> {
  /** Response data payload */
  data: T;
  
  /** Response timestamp */
  timestamp: string;
  
  /** Optional metadata about the response */
  meta?: {
    /** Total count for paginated responses */
    total?: number;
    
    /** Processing time in milliseconds */
    processing_time_ms?: number;
    
    /** Additional context information */
    [key: string]: any;
  };
}

/**
 * Standard error response structure
 * 
 * This interface ensures consistent error formatting
 * across all API endpoints for better client handling.
 */
export interface ErrorResponse {
  error: {
    /** Error code for programmatic handling */
    code: string;
    
    /** Human-readable error message */
    message: string;
    
    /** Additional error details or validation errors */
    details?: any;
    
    /** Error timestamp */
    timestamp: string;
    
    /** Request ID for debugging (optional) */
    request_id?: string;
  };
}

/**
 * File upload response for CSV processing
 * 
 * This interface provides feedback about CSV upload
 * and parsing results to the client.
 */
export interface UploadResponse {
  /** Number of leads successfully processed */
  leads_processed: number;
  
  /** Number of leads that failed validation */
  leads_rejected: number;
  
  /** Array of validation errors for rejected leads */
  validation_errors: ValidationError[];
  
  /** Upload processing summary */
  summary: {
    /** Total rows in the uploaded file */
    total_rows: number;
    
    /** File size in bytes */
    file_size_bytes: number;
    
    /** Processing time in milliseconds */
    processing_time_ms: number;
  };
}

/**
 * Validation error details
 * 
 * This interface provides specific information about
 * validation failures for individual leads or fields.
 */
export interface ValidationError {
  /** Row number in the CSV file (1-based) */
  row: number;
  
  /** Field name that failed validation */
  field?: string;
  
  /** Validation error message */
  message: string;
  
  /** The invalid value that caused the error */
  value?: any;
}

/**
 * Scoring process response
 * 
 * This interface provides feedback about the lead scoring
 * process execution and results summary.
 */
export interface ScoringResponse {
  /** Number of leads successfully scored */
  leads_scored: number;
  
  /** Number of leads that failed scoring */
  leads_failed: number;
  
  /** Scoring process summary statistics */
  summary: {
    /** Average score across all leads */
    average_score: number;
    
    /** Distribution of intent levels */
    intent_distribution: {
      High: number;
      Medium: number;
      Low: number;
    };
    
    /** Total processing time in milliseconds */
    processing_time_ms: number;
    
    /** Timestamp when scoring was completed */
    completed_at: string;
  };
  
  /** Array of any errors encountered during scoring */
  errors?: ScoringError[];
}

/**
 * Scoring error details
 * 
 * This interface captures errors that occur during
 * the lead scoring process for individual leads.
 */
export interface ScoringError {
  /** Lead name for identification */
  lead_name: string;
  
  /** Error type (rule_engine, ai_service, etc.) */
  error_type: 'rule_engine' | 'ai_service' | 'data_processing' | 'unknown';
  
  /** Error message */
  message: string;
  
  /** Whether the lead was scored with fallback logic */
  fallback_applied: boolean;
}

/**
 * Health check response
 * 
 * This interface provides system status information
 * for monitoring and debugging purposes.
 */
export interface HealthResponse {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Response timestamp */
  timestamp: string;
  
  /** Environment information */
  environment: string;
  
  /** Application version */
  version: string;
  
  /** Individual service checks */
  checks: {
    /** AI service connectivity */
    ai_service: ServiceCheck;
    
    /** Memory usage status */
    memory: ServiceCheck;
    
    /** Application startup status */
    startup: ServiceCheck;
  };
}

/**
 * Individual service check result
 * 
 * This interface provides detailed status information
 * for individual system components.
 */
export interface ServiceCheck {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Response time in milliseconds */
  response_time_ms?: number;
  
  /** Additional status details */
  details?: string;
  
  /** Last check timestamp */
  last_checked: string;
}

/**
 * Common HTTP status codes used in the API
 * 
 * This enum provides consistent status code usage
 * across all endpoints and error handling.
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Common error codes for consistent error handling
 * 
 * This enum provides standardized error codes that
 * clients can use for programmatic error handling.
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Business logic errors
  NO_OFFER_DATA = 'NO_OFFER_DATA',
  NO_LEADS_DATA = 'NO_LEADS_DATA',
  SCORING_IN_PROGRESS = 'SCORING_IN_PROGRESS',
  
  // File processing errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  CSV_PARSING_ERROR = 'CSV_PARSING_ERROR',
  
  // External service errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_RATE_LIMIT_EXCEEDED = 'AI_RATE_LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
}