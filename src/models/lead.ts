/**
 * Lead Data Models and Interfaces
 * 
 * Defines the structure and validation for lead information
 * including raw lead data and scored results.
 */

/**
 * Core Lead interface representing prospect information
 * 
 * This interface defines the structure of lead data parsed
 * from CSV uploads. All fields are required for complete
 * lead profiles used in scoring algorithms.
 */
export interface Lead {
  /** Full name of the prospect */
  name: string;
  
  /** Job title or role at their company */
  role: string;
  
  /** Company name where the prospect works */
  company: string;
  
  /** Industry sector of the prospect's company */
  industry: string;
  
  /** Geographic location (city, state, country, etc.) */
  location: string;
  
  /** LinkedIn bio or professional summary */
  linkedin_bio: string;
  
  /** Timestamp when the lead was uploaded */
  uploaded_at: Date;
}

/**
 * Lead data payload from CSV parsing
 * 
 * This interface represents the raw data structure
 * expected from CSV files before server-side processing.
 * The uploaded_at timestamp is added during processing.
 */
export interface LeadData {
  /** Full name of the prospect */
  name: string;
  
  /** Job title or role at their company */
  role: string;
  
  /** Company name where the prospect works */
  company: string;
  
  /** Industry sector of the prospect's company */
  industry: string;
  
  /** Geographic location */
  location: string;
  
  /** LinkedIn bio or professional summary */
  linkedin_bio: string;
  
  /** Timestamp when the lead was uploaded (optional, added during processing) */
  uploaded_at?: Date;
}

/**
 * Intent level classification for lead scoring
 * 
 * These levels correspond to the AI analysis output
 * and determine the AI scoring component.
 */
export type IntentLevel = 'High' | 'Medium' | 'Low';

/**
 * Rule-based scoring breakdown
 * 
 * This interface provides transparency into how
 * the rule-based scoring component was calculated.
 */
export interface RuleScoreBreakdown {
  /** Points awarded for role relevance (0, 10, or 20) */
  role_score: number;
  
  /** Points awarded for industry match (0, 10, or 20) */
  industry_score: number;
  
  /** Points awarded for data completeness (0 or 10) */
  completeness_score: number;
  
  /** Total rule-based score (max 50 points) */
  total_rule_score: number;
}

/**
 * AI analysis results
 * 
 * This interface captures the output from AI-powered
 * intent analysis including reasoning and confidence.
 */
export interface AIAnalysis {
  /** Intent classification from AI analysis */
  intent: IntentLevel;
  
  /** AI-generated reasoning (1-2 sentences) */
  reasoning: string;
  
  /** Numeric score based on intent level */
  score: number;
  
  /** Optional confidence score from AI model */
  confidence?: number;
}

/**
 * Complete scored lead with all analysis results
 * 
 * This interface represents the final output after
 * both rule-based and AI scoring have been applied.
 */
export interface ScoredLead extends Lead {
  /** Final intent classification (High/Medium/Low) */
  intent: IntentLevel;
  
  /** Total score (0-100, rule_score + ai_score) */
  score: number;
  
  /** Combined reasoning from rules and AI analysis */
  reasoning: string;
  
  /** Detailed breakdown of rule-based scoring */
  rule_breakdown: RuleScoreBreakdown;
  
  /** AI analysis results and reasoning */
  ai_analysis: AIAnalysis;
  
  /** Timestamp when scoring was completed */
  scored_at: Date;
}

/**
 * Lead validation constraints
 * 
 * These constants define the validation rules for lead data
 * to ensure data quality and completeness.
 */
export const LEAD_CONSTRAINTS = {
  /** Field length constraints for all lead fields */
  FIELD_LENGTHS: {
    NAME: { MIN: 1, MAX: 100 },
    ROLE: { MIN: 1, MAX: 100 },
    COMPANY: { MIN: 1, MAX: 100 },
    INDUSTRY: { MIN: 1, MAX: 100 },
    LOCATION: { MIN: 1, MAX: 100 },
    LINKEDIN_BIO: { MIN: 1, MAX: 1000 }
  },
  
  /** CSV file constraints */
  FILE: {
    MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_LEADS_PER_UPLOAD: 1000
  },
  
  /** Required CSV columns in exact order */
  REQUIRED_COLUMNS: [
    'name',
    'role', 
    'company',
    'industry',
    'location',
    'linkedin_bio'
  ] as const
} as const;

/**
 * AI scoring point mapping
 * 
 * Maps intent levels to their corresponding point values
 * for the AI component of the scoring algorithm.
 */
export const AI_SCORE_MAPPING = {
  High: 50,
  Medium: 30,
  Low: 10
} as const;

/**
 * Type guard to check if an object is valid LeadData
 * 
 * @param obj - Object to validate
 * @returns True if object matches LeadData interface
 */
export function isLeadData(obj: any): obj is LeadData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.name === 'string' &&
    typeof obj.role === 'string' &&
    typeof obj.company === 'string' &&
    typeof obj.industry === 'string' &&
    typeof obj.location === 'string' &&
    typeof obj.linkedin_bio === 'string'
  );
}

/**
 * Validates that all required fields are present and non-empty
 * 
 * @param lead - Lead data to validate
 * @returns True if all fields are present and non-empty
 */
export function hasCompleteData(lead: LeadData): boolean {
  return (
    lead.name.trim().length > 0 &&
    lead.role.trim().length > 0 &&
    lead.company.trim().length > 0 &&
    lead.industry.trim().length > 0 &&
    lead.location.trim().length > 0 &&
    lead.linkedin_bio.trim().length > 0
  );
}