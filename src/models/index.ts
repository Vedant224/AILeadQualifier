/**
 * Models Index
 * 
 * Central export point for all data models, interfaces, and types
 * used throughout the Lead Scoring Backend API application.
 * 
 * This barrel export pattern provides a clean import interface
 * for other modules and ensures consistent model usage.
 */

// Offer-related models and interfaces
export {
  Offer,
  OfferPayload,
  OFFER_CONSTRAINTS,
  isOfferPayload
} from './offer';

// Lead-related models and interfaces
export {
  Lead,
  LeadData,
  IntentLevel,
  RuleScoreBreakdown,
  AIAnalysis,
  ScoredLead,
  LEAD_CONSTRAINTS,
  AI_SCORE_MAPPING,
  isLeadData,
  hasCompleteData
} from './lead';

// API response models and interfaces
export {
  ApiResponse,
  ErrorResponse,
  UploadResponse,
  ValidationError,
  ScoringResponse,
  ScoringError,
  HealthResponse,
  ServiceCheck,
  HttpStatus,
  ErrorCode
} from './api';

/**
 * Type utility for extracting data from API responses
 * 
 * This utility type helps with type inference when working
 * with API response wrappers in client code.
 */
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Union type for all possible error codes
 * 
 * This type provides compile-time checking for error code usage
 * and ensures consistency across error handling.
 */
export type AllErrorCodes = keyof typeof ErrorCode;

/**
 * Union type for all possible HTTP status codes
 * 
 * This type provides compile-time checking for status code usage
 * and ensures consistency across response handling.
 */
export type AllHttpStatus = keyof typeof HttpStatus;