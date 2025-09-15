/**
 * AI Prompt Templates and Utilities
 * 
 * Provides structured prompt templates and utilities for AI interactions.
 * Ensures consistent prompt engineering and easy maintenance of AI prompts.
 */

import { LeadData, OfferPayload } from '../models';

/**
 * Prompt template configuration
 */
export interface PromptConfig {
  /** Include detailed instructions */
  includeInstructions: boolean;
  
  /** Include examples in prompt */
  includeExamples: boolean;
  
  /** Maximum prompt length */
  maxLength: number;
  
  /** Response format specification */
  responseFormat: 'structured' | 'natural';
}

/**
 * Default prompt configuration
 */
export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  includeInstructions: true,
  includeExamples: false,
  maxLength: 2000,
  responseFormat: 'structured'
};

/**
 * Intent analysis prompt template
 * 
 * Generates structured prompts for lead intent analysis
 * with configurable detail levels and formatting.
 * 
 * @param lead - Lead data for analysis
 * @param offer - Offer context
 * @param config - Prompt configuration options
 * @returns Formatted prompt string
 */
export function generateIntentAnalysisPrompt(
  lead: LeadData,
  offer: OfferPayload,
  config: PromptConfig = DEFAULT_PROMPT_CONFIG
): string {
  const sections: string[] = [];
  
  // Lead information section
  sections.push(`LEAD PROFILE:
Name: ${lead.name}
Role: ${lead.role}
Company: ${lead.company}
Industry: ${lead.industry}
Location: ${lead.location}
Professional Background: ${truncateText(lead.linkedin_bio, 300)}`);
  
  // Offer information section
  sections.push(`PRODUCT OFFERING:
Product: ${offer.name}
Key Benefits: ${offer.value_props.join(' • ')}
Target Use Cases: ${offer.ideal_use_cases.join(' • ')}`);
  
  // Analysis instructions
  if (config.includeInstructions) {
    sections.push(`ANALYSIS TASK:
Evaluate this lead's buying intent for the product offering based on:

1. DECISION AUTHORITY: Does their role indicate purchasing decision power?
   - C-level, VP, Director roles = High authority
   - Manager, Senior roles = Medium authority
   - Individual contributor roles = Low authority

2. INDUSTRY ALIGNMENT: How well does their industry match the target use cases?
   - Direct industry match = High alignment
   - Adjacent/related industry = Medium alignment
   - Unrelated industry = Low alignment

3. COMPANY PROFILE: Does their company profile suggest product need?
   - Size, stage, and characteristics matching ideal customer profile
   - Professional background indicating relevant challenges/needs

4. ENGAGEMENT INDICATORS: Any signals of interest or need?
   - Professional background mentioning relevant challenges
   - Company characteristics suggesting product fit`);
  }
  
  // Response format specification
  if (config.responseFormat === 'structured') {
    sections.push(`RESPONSE FORMAT:
Intent: [High/Medium/Low]
Reasoning: [Provide 1-2 sentences explaining your classification, focusing on the key factors that influenced your decision]

CLASSIFICATION CRITERIA:
• High Intent: Strong decision authority + excellent product-market fit + clear need indicators
• Medium Intent: Some decision influence OR good fit but missing key elements OR mixed signals
• Low Intent: Limited decision authority + poor product fit OR insufficient relevant information`);
  }
  
  // Examples (if requested)
  if (config.includeExamples) {
    sections.push(`EXAMPLES:

High Intent Example:
"Intent: High
Reasoning: CEO of a mid-market SaaS company with clear decision authority and direct industry alignment with the AI automation offering."

Medium Intent Example:
"Intent: Medium
Reasoning: Senior manager role provides some influence, and technology background suggests potential interest, but industry fit is not perfect."

Low Intent Example:
"Intent: Low
Reasoning: Individual contributor role with limited decision authority in an unrelated industry with no clear product need indicators."`);
  }
  
  // Final instruction
  sections.push('Please analyze this lead and provide your assessment:');
  
  // Join sections and apply length limit
  const fullPrompt = sections.join('\n\n');
  
  if (fullPrompt.length > config.maxLength) {
    console.warn(`⚠️ Prompt length (${fullPrompt.length}) exceeds maximum (${config.maxLength}), truncating...`);
    return truncateText(fullPrompt, config.maxLength);
  }
  
  return fullPrompt;
}

/**
 * Generates a simplified prompt for quick analysis
 * 
 * Creates a concise prompt for faster AI processing
 * when detailed analysis is not required.
 * 
 * @param lead - Lead data
 * @param offer - Offer data
 * @returns Simplified prompt string
 */
export function generateQuickAnalysisPrompt(lead: LeadData, offer: OfferPayload): string {
  return `Analyze buying intent for ${offer.name}:

Lead: ${lead.name}, ${lead.role} at ${lead.company} (${lead.industry})
Product: ${offer.name} - ${offer.value_props[0]}
Target: ${offer.ideal_use_cases[0]}

Classify as High/Medium/Low intent with brief reasoning:`;
}

/**
 * Generates a follow-up analysis prompt
 * 
 * Creates prompts for deeper analysis or clarification
 * based on initial AI responses.
 * 
 * @param lead - Lead data
 * @param offer - Offer data
 * @param previousAnalysis - Previous AI analysis result
 * @returns Follow-up prompt string
 */
export function generateFollowUpPrompt(
  lead: LeadData,
  offer: OfferPayload,
  previousAnalysis: string
): string {
  return `Previous analysis: "${previousAnalysis}"

Please provide additional insights about this lead's potential:

Lead: ${lead.name} (${lead.role}, ${lead.company})
Product: ${offer.name}

Focus on:
1. Specific pain points this lead might have
2. Potential objections or concerns
3. Best approach for engagement
4. Timeline likelihood for purchase decision

Provide 2-3 actionable insights:`;
}

/**
 * Validates prompt quality and provides suggestions
 * 
 * Analyzes generated prompts for quality issues and
 * provides recommendations for improvement.
 * 
 * @param prompt - Prompt to validate
 * @returns Validation result with suggestions
 */
export function validatePrompt(prompt: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  metrics: {
    length: number;
    wordCount: number;
    sentenceCount: number;
  };
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Calculate metrics
  const length = prompt.length;
  const wordCount = prompt.split(/\s+/).length;
  const sentenceCount = prompt.split(/[.!?]+/).length;
  
  // Check length
  if (length < 100) {
    issues.push('Prompt is very short and may lack context');
    suggestions.push('Add more context about the lead and offer');
  } else if (length > 3000) {
    issues.push('Prompt is very long and may hit token limits');
    suggestions.push('Consider using a more concise format');
  }
  
  // Check for required elements
  if (!prompt.toLowerCase().includes('intent')) {
    issues.push('Prompt does not mention intent classification');
    suggestions.push('Include clear intent classification instructions');
  }
  
  if (!prompt.toLowerCase().includes('high') || !prompt.toLowerCase().includes('medium') || !prompt.toLowerCase().includes('low')) {
    issues.push('Prompt does not specify intent levels');
    suggestions.push('Clearly define High/Medium/Low intent criteria');
  }
  
  // Check for clarity
  if (prompt.split('\n').length < 3) {
    suggestions.push('Consider structuring the prompt with clear sections');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    metrics: {
      length,
      wordCount,
      sentenceCount
    }
  };
}

/**
 * Truncates text to specified length while preserving word boundaries
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last space before the limit
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Prompt templates for different scenarios
 */
export const PROMPT_TEMPLATES = {
  /** Standard intent analysis */
  STANDARD_INTENT: generateIntentAnalysisPrompt,
  
  /** Quick analysis for high-volume processing */
  QUICK_ANALYSIS: generateQuickAnalysisPrompt,
  
  /** Follow-up analysis for deeper insights */
  FOLLOW_UP: generateFollowUpPrompt,
  
  /** Connectivity test prompt */
  CONNECTIVITY_TEST: () => 'Respond with "CONNECTED" to confirm AI service is working.',
  
  /** Fallback prompt for error recovery */
  FALLBACK: (lead: LeadData, offer: OfferPayload) => 
    `Simple intent check: ${lead.role} at ${lead.company} for ${offer.name}. High/Medium/Low?`
} as const;