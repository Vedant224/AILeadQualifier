/**
 * Offer Data Models and Interfaces
 * 
 * Defines the structure and validation for product/offer information
 * that will be used as context for lead scoring and AI analysis.
 */

/**
 * Core Offer interface representing product/service information
 * 
 * This interface defines the structure of offer data that clients
 * submit via the POST /offer endpoint. The offer information is used
 * as context for both rule-based scoring and AI intent analysis.
 */
export interface Offer {
  /** 
   * Product or service name
   * Used to identify the offering in scoring context
   */
  name: string;
  
  /** 
   * Array of value propositions or key benefits
   * Used by AI to understand product value and match with lead needs
   */
  value_props: string[];
  
  /** 
   * Array of ideal use cases or target scenarios
   * Used for industry matching in rule-based scoring
   */
  ideal_use_cases: string[];
  
  /** 
   * Timestamp when the offer was created/updated
   * Used for tracking and potential cache invalidation
   */
  created_at: Date;
}

/**
 * Offer payload interface for API requests
 * 
 * This interface represents the data structure expected
 * from clients when submitting offer information.
 * The created_at timestamp is added server-side.
 */
export interface OfferPayload {
  /** Product or service name (1-200 characters) */
  name: string;
  
  /** Array of value propositions (1-10 items, each 1-500 characters) */
  value_props: string[];
  
  /** Array of ideal use cases (1-10 items, each 1-200 characters) */
  ideal_use_cases: string[];
}

/**
 * Offer validation constraints
 * 
 * These constants define the validation rules for offer data
 * to ensure data quality and prevent abuse.
 */
export const OFFER_CONSTRAINTS = {
  /** Minimum and maximum length for offer name */
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  
  /** Constraints for value propositions array */
  VALUE_PROPS: {
    MIN_ITEMS: 1,
    MAX_ITEMS: 10,
    ITEM_MIN_LENGTH: 1,
    ITEM_MAX_LENGTH: 500
  },
  
  /** Constraints for ideal use cases array */
  IDEAL_USE_CASES: {
    MIN_ITEMS: 1,
    MAX_ITEMS: 10,
    ITEM_MIN_LENGTH: 1,
    ITEM_MAX_LENGTH: 200
  }
} as const;

/**
 * Type guard to check if an object is a valid OfferPayload
 * 
 * @param obj - Object to validate
 * @returns True if object matches OfferPayload interface
 */
export function isOfferPayload(obj: any): obj is OfferPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.value_props) &&
    obj.value_props.every((prop: any) => typeof prop === 'string') &&
    Array.isArray(obj.ideal_use_cases) &&
    obj.ideal_use_cases.every((useCase: any) => typeof useCase === 'string')
  );
}