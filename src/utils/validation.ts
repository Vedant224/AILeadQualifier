/**
 * Validation Utilities
 * 
 * Provides comprehensive validation functions for all data types
 * used in the Lead Scoring Backend API, including offers, leads,
 * and file uploads with detailed error reporting.
 */

import { 
  OfferPayload, 
  OFFER_CONSTRAINTS,
  LeadData,
  LEAD_CONSTRAINTS,
  ValidationError,
  ErrorCode
} from '../models';

/**
 * Validation result interface
 * 
 * Provides structured feedback about validation success/failure
 * with detailed error information for debugging and user feedback.
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Array of validation errors if validation failed */
  errors: ValidationError[];
  
  /** Optional additional context about the validation */
  context?: string;
}

/**
 * Validates offer payload data
 * 
 * Performs comprehensive validation of offer data including
 * field presence, type checking, and constraint validation.
 * 
 * @param payload - Offer payload to validate
 * @returns Validation result with detailed error information
 */
export function validateOfferPayload(payload: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if payload exists and is an object
  if (!payload || typeof payload !== 'object') {
    errors.push({
      row: 0,
      field: 'payload',
      message: 'Request body must be a valid JSON object',
      value: payload
    });
    return { isValid: false, errors, context: 'offer_validation' };
  }
  
  // Validate name field
  if (!payload.name) {
    errors.push({
      row: 0,
      field: 'name',
      message: 'Name is required',
      value: payload.name
    });
  } else if (typeof payload.name !== 'string') {
    errors.push({
      row: 0,
      field: 'name',
      message: 'Name must be a string',
      value: payload.name
    });
  } else {
    const nameLength = payload.name.trim().length;
    if (nameLength < OFFER_CONSTRAINTS.NAME.MIN_LENGTH) {
      errors.push({
        row: 0,
        field: 'name',
        message: `Name must be at least ${OFFER_CONSTRAINTS.NAME.MIN_LENGTH} character(s)`,
        value: payload.name
      });
    } else if (nameLength > OFFER_CONSTRAINTS.NAME.MAX_LENGTH) {
      errors.push({
        row: 0,
        field: 'name',
        message: `Name must not exceed ${OFFER_CONSTRAINTS.NAME.MAX_LENGTH} characters`,
        value: payload.name
      });
    }
  }
  
  // Validate value_props field
  if (!payload.value_props) {
    errors.push({
      row: 0,
      field: 'value_props',
      message: 'Value propositions are required',
      value: payload.value_props
    });
  } else if (!Array.isArray(payload.value_props)) {
    errors.push({
      row: 0,
      field: 'value_props',
      message: 'Value propositions must be an array',
      value: payload.value_props
    });
  } else {
    // Validate array length
    if (payload.value_props.length < OFFER_CONSTRAINTS.VALUE_PROPS.MIN_ITEMS) {
      errors.push({
        row: 0,
        field: 'value_props',
        message: `At least ${OFFER_CONSTRAINTS.VALUE_PROPS.MIN_ITEMS} value proposition(s) required`,
        value: payload.value_props
      });
    } else if (payload.value_props.length > OFFER_CONSTRAINTS.VALUE_PROPS.MAX_ITEMS) {
      errors.push({
        row: 0,
        field: 'value_props',
        message: `Maximum ${OFFER_CONSTRAINTS.VALUE_PROPS.MAX_ITEMS} value propositions allowed`,
        value: payload.value_props
      });
    }
    
    // Validate each value proposition
    payload.value_props.forEach((prop: any, index: number) => {
      if (typeof prop !== 'string') {
        errors.push({
          row: 0,
          field: `value_props[${index}]`,
          message: 'Each value proposition must be a string',
          value: prop
        });
      } else {
        const propLength = prop.trim().length;
        if (propLength < OFFER_CONSTRAINTS.VALUE_PROPS.ITEM_MIN_LENGTH) {
          errors.push({
            row: 0,
            field: `value_props[${index}]`,
            message: `Value proposition must be at least ${OFFER_CONSTRAINTS.VALUE_PROPS.ITEM_MIN_LENGTH} character(s)`,
            value: prop
          });
        } else if (propLength > OFFER_CONSTRAINTS.VALUE_PROPS.ITEM_MAX_LENGTH) {
          errors.push({
            row: 0,
            field: `value_props[${index}]`,
            message: `Value proposition must not exceed ${OFFER_CONSTRAINTS.VALUE_PROPS.ITEM_MAX_LENGTH} characters`,
            value: prop
          });
        }
      }
    });
  }
  
  // Validate ideal_use_cases field
  if (!payload.ideal_use_cases) {
    errors.push({
      row: 0,
      field: 'ideal_use_cases',
      message: 'Ideal use cases are required',
      value: payload.ideal_use_cases
    });
  } else if (!Array.isArray(payload.ideal_use_cases)) {
    errors.push({
      row: 0,
      field: 'ideal_use_cases',
      message: 'Ideal use cases must be an array',
      value: payload.ideal_use_cases
    });
  } else {
    // Validate array length
    if (payload.ideal_use_cases.length < OFFER_CONSTRAINTS.IDEAL_USE_CASES.MIN_ITEMS) {
      errors.push({
        row: 0,
        field: 'ideal_use_cases',
        message: `At least ${OFFER_CONSTRAINTS.IDEAL_USE_CASES.MIN_ITEMS} ideal use case(s) required`,
        value: payload.ideal_use_cases
      });
    } else if (payload.ideal_use_cases.length > OFFER_CONSTRAINTS.IDEAL_USE_CASES.MAX_ITEMS) {
      errors.push({
        row: 0,
        field: 'ideal_use_cases',
        message: `Maximum ${OFFER_CONSTRAINTS.IDEAL_USE_CASES.MAX_ITEMS} ideal use cases allowed`,
        value: payload.ideal_use_cases
      });
    }
    
    // Validate each use case
    payload.ideal_use_cases.forEach((useCase: any, index: number) => {
      if (typeof useCase !== 'string') {
        errors.push({
          row: 0,
          field: `ideal_use_cases[${index}]`,
          message: 'Each ideal use case must be a string',
          value: useCase
        });
      } else {
        const useCaseLength = useCase.trim().length;
        if (useCaseLength < OFFER_CONSTRAINTS.IDEAL_USE_CASES.ITEM_MIN_LENGTH) {
          errors.push({
            row: 0,
            field: `ideal_use_cases[${index}]`,
            message: `Ideal use case must be at least ${OFFER_CONSTRAINTS.IDEAL_USE_CASES.ITEM_MIN_LENGTH} character(s)`,
            value: useCase
          });
        } else if (useCaseLength > OFFER_CONSTRAINTS.IDEAL_USE_CASES.ITEM_MAX_LENGTH) {
          errors.push({
            row: 0,
            field: `ideal_use_cases[${index}]`,
            message: `Ideal use case must not exceed ${OFFER_CONSTRAINTS.IDEAL_USE_CASES.ITEM_MAX_LENGTH} characters`,
            value: useCase
          });
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    context: 'offer_validation'
  };
}

/**
 * Validates lead data from CSV parsing
 * 
 * Performs comprehensive validation of individual lead records
 * including field presence, type checking, and length constraints.
 * 
 * @param leadData - Lead data to validate
 * @param rowNumber - Row number in CSV for error reporting
 * @returns Validation result with detailed error information
 */
export function validateLeadData(leadData: any, rowNumber: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if leadData exists and is an object
  if (!leadData || typeof leadData !== 'object') {
    errors.push({
      row: rowNumber,
      field: 'lead_data',
      message: 'Lead data must be a valid object',
      value: leadData
    });
    return { isValid: false, errors, context: 'lead_validation' };
  }
  
  // Validate each required field
  LEAD_CONSTRAINTS.REQUIRED_COLUMNS.forEach(field => {
    const value = leadData[field];
    const constraints = LEAD_CONSTRAINTS.FIELD_LENGTHS[field.toUpperCase() as keyof typeof LEAD_CONSTRAINTS.FIELD_LENGTHS];
    
    // Check field presence
    if (value === undefined || value === null) {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} is required`,
        value
      });
      return;
    }
    
    // Check field type
    if (typeof value !== 'string') {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} must be a string`,
        value
      });
      return;
    }
    
    // Check field length constraints
    const trimmedLength = value.trim().length;
    if (trimmedLength < constraints.MIN) {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} must be at least ${constraints.MIN} character(s)`,
        value
      });
    } else if (trimmedLength > constraints.MAX) {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} must not exceed ${constraints.MAX} characters`,
        value
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    context: 'lead_validation'
  };
}

/**
 * Validates CSV file structure and headers
 * 
 * Ensures the uploaded CSV file has the correct structure
 * and required column headers for lead data processing.
 * 
 * @param headers - Array of column headers from CSV
 * @returns Validation result with header validation errors
 */
export function validateCSVHeaders(headers: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if headers exist
  if (!headers || !Array.isArray(headers)) {
    errors.push({
      row: 0,
      field: 'headers',
      message: 'CSV file must have valid headers',
      value: headers
    });
    return { isValid: false, errors, context: 'csv_validation' };
  }
  
  // Normalize headers (trim and lowercase for comparison)
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  const requiredHeaders = LEAD_CONSTRAINTS.REQUIRED_COLUMNS.map(h => h.toLowerCase());
  
  // Check for missing required headers
  requiredHeaders.forEach(requiredHeader => {
    if (!normalizedHeaders.includes(requiredHeader)) {
      errors.push({
        row: 0,
        field: 'headers',
        message: `Missing required column: ${requiredHeader}`,
        value: headers
      });
    }
  });
  
  // Check for extra unexpected headers (warning, not error)
  const extraHeaders = normalizedHeaders.filter(h => !requiredHeaders.includes(h));
  if (extraHeaders.length > 0) {
    // Note: This is informational, not an error
    console.warn(`CSV contains extra columns that will be ignored: ${extraHeaders.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    context: 'csv_validation'
  };
}

/**
 * Validates file upload constraints
 * 
 * Checks file size and other upload-related constraints
 * before processing the uploaded CSV file.
 * 
 * @param file - Uploaded file object
 * @returns Validation result with file constraint errors
 */
export function validateFileUpload(file: Express.Multer.File): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if file exists
  if (!file) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'No file uploaded',
      value: null
    });
    return { isValid: false, errors, context: 'file_validation' };
  }
  
  // Check file size
  if (file.size > LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES) {
    errors.push({
      row: 0,
      field: 'file',
      message: `File size exceeds maximum allowed size of ${LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES} bytes`,
      value: file.size
    });
  }
  
  // Check file type (should be CSV)
  if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'File must be a CSV file',
      value: file.mimetype
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    context: 'file_validation'
  };
}