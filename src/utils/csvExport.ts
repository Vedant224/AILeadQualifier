/**
 * CSV Export Utilities
 * 
 * Provides utilities for exporting scored lead results to CSV format
 * with proper formatting, escaping, and comprehensive data inclusion.
 */

import { ScoredLead } from '../models';

/**
 * CSV export configuration options
 */
interface CSVExportConfig {
  /** Include detailed rule breakdown columns */
  includeRuleBreakdown: boolean;
  
  /** Include AI analysis details */
  includeAIDetails: boolean;
  
  /** Include timestamps */
  includeTimestamps: boolean;
  
  /** Custom field separator */
  separator: string;
  
  /** Include header row */
  includeHeaders: boolean;
  
  /** Maximum reasoning text length */
  maxReasoningLength: number;
}

/**
 * Default CSV export configuration
 */
const DEFAULT_CSV_CONFIG: CSVExportConfig = {
  includeRuleBreakdown: true,
  includeAIDetails: true,
  includeTimestamps: true,
  separator: ',',
  includeHeaders: true,
  maxReasoningLength: 200
};

/**
 * Generates CSV content from scored lead results
 * 
 * Creates a comprehensive CSV export with all scoring details,
 * proper escaping, and configurable field inclusion.
 * 
 * @param results - Array of scored lead results
 * @param config - Export configuration options
 * @returns CSV content as string
 */
export function generateCSVFromResults(
  results: ScoredLead[],
  config: Partial<CSVExportConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_CSV_CONFIG, ...config };
  const lines: string[] = [];
  
  // Generate header row
  if (finalConfig.includeHeaders) {
    const headers = generateCSVHeaders(finalConfig);
    lines.push(headers.join(finalConfig.separator));
  }
  
  // Generate data rows
  for (const result of results) {
    const row = generateCSVRow(result, finalConfig);
    lines.push(row.join(finalConfig.separator));
  }
  
  return lines.join('\n');
}

/**
 * Generates CSV headers based on configuration
 * 
 * @param config - Export configuration
 * @returns Array of header strings
 */
function generateCSVHeaders(config: CSVExportConfig): string[] {
  const headers = [
    'name',
    'role',
    'company',
    'industry',
    'location',
    'intent',
    'total_score',
    'reasoning'
  ];
  
  if (config.includeRuleBreakdown) {
    headers.push(
      'rule_total_score',
      'rule_role_score',
      'rule_industry_score',
      'rule_completeness_score'
    );
  }
  
  if (config.includeAIDetails) {
    headers.push(
      'ai_intent',
      'ai_score',
      'ai_reasoning',
      'ai_confidence'
    );
  }
  
  if (config.includeTimestamps) {
    headers.push(
      'uploaded_at',
      'scored_at'
    );
  }
  
  return headers;
}

/**
 * Generates a CSV row for a single scored lead
 * 
 * @param result - Scored lead result
 * @param config - Export configuration
 * @returns Array of field values
 */
function generateCSVRow(result: ScoredLead, config: CSVExportConfig): string[] {
  const row = [
    escapeCSVField(result.name),
    escapeCSVField(result.role),
    escapeCSVField(result.company),
    escapeCSVField(result.industry),
    escapeCSVField(result.location),
    escapeCSVField(result.intent),
    result.score.toString(),
    escapeCSVField(truncateText(result.reasoning, config.maxReasoningLength))
  ];
  
  if (config.includeRuleBreakdown) {
    row.push(
      result.rule_breakdown.total_rule_score.toString(),
      result.rule_breakdown.role_score.toString(),
      result.rule_breakdown.industry_score.toString(),
      result.rule_breakdown.completeness_score.toString()
    );
  }
  
  if (config.includeAIDetails) {
    row.push(
      escapeCSVField(result.ai_analysis.intent),
      result.ai_analysis.score.toString(),
      escapeCSVField(truncateText(result.ai_analysis.reasoning, config.maxReasoningLength)),
      (result.ai_analysis.confidence || 0).toFixed(2)
    );
  }
  
  if (config.includeTimestamps) {
    row.push(
      escapeCSVField(result.uploaded_at.toISOString()),
      escapeCSVField(result.scored_at.toISOString())
    );
  }
  
  return row;
}

/**
 * Escapes a field value for CSV format
 * 
 * Handles quotes, commas, and newlines according to CSV standards.
 * 
 * @param value - Field value to escape
 * @returns Escaped CSV field
 */
function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Check if escaping is needed
  const needsEscaping = stringValue.includes('"') || 
                       stringValue.includes(',') || 
                       stringValue.includes('\n') || 
                       stringValue.includes('\r');
  
  if (!needsEscaping) {
    return stringValue;
  }
  
  // Escape quotes by doubling them and wrap in quotes
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Truncates text to specified length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generates a summary CSV with aggregated statistics
 * 
 * Creates a separate CSV with summary statistics about the scoring results
 * for executive reporting and analysis.
 * 
 * @param results - Array of scored lead results
 * @returns Summary CSV content
 */
export function generateSummaryCSV(results: ScoredLead[]): string {
  if (results.length === 0) {
    return 'metric,value\ntotal_leads,0\n';
  }
  
  // Calculate summary statistics
  const totalLeads = results.length;
  const avgScore = results.reduce((sum, lead) => sum + lead.score, 0) / totalLeads;
  
  const distribution = {
    High: results.filter(lead => lead.intent === 'High').length,
    Medium: results.filter(lead => lead.intent === 'Medium').length,
    Low: results.filter(lead => lead.intent === 'Low').length
  };
  
  const scoreRanges = {
    '80-100': results.filter(lead => lead.score >= 80).length,
    '60-79': results.filter(lead => lead.score >= 60 && lead.score < 80).length,
    '40-59': results.filter(lead => lead.score >= 40 && lead.score < 60).length,
    '20-39': results.filter(lead => lead.score >= 20 && lead.score < 40).length,
    '0-19': results.filter(lead => lead.score < 20).length
  };
  
  // Top industries
  const industryCount = results.reduce((acc, lead) => {
    acc[lead.industry] = (acc[lead.industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topIndustries = Object.entries(industryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  // Generate summary CSV
  const summaryLines = [
    'metric,value',
    `total_leads,${totalLeads}`,
    `average_score,${avgScore.toFixed(2)}`,
    `high_intent_count,${distribution.High}`,
    `medium_intent_count,${distribution.Medium}`,
    `low_intent_count,${distribution.Low}`,
    `high_intent_percentage,${((distribution.High / totalLeads) * 100).toFixed(1)}%`,
    `score_80_100,${scoreRanges['80-100']}`,
    `score_60_79,${scoreRanges['60-79']}`,
    `score_40_59,${scoreRanges['40-59']}`,
    `score_20_39,${scoreRanges['20-39']}`,
    `score_0_19,${scoreRanges['0-19']}`,
    '',
    'top_industries,count'
  ];
  
  // Add top industries
  topIndustries.forEach(([industry, count]) => {
    summaryLines.push(`${escapeCSVField(industry)},${count}`);
  });
  
  return summaryLines.join('\n');
}

/**
 * Generates a detailed breakdown CSV for analysis
 * 
 * Creates a CSV focused on scoring breakdown details for
 * understanding how scores were calculated.
 * 
 * @param results - Array of scored lead results
 * @returns Breakdown CSV content
 */
export function generateBreakdownCSV(results: ScoredLead[]): string {
  const headers = [
    'name',
    'company',
    'total_score',
    'intent',
    'rule_total',
    'rule_role',
    'rule_industry', 
    'rule_completeness',
    'ai_score',
    'ai_intent',
    'ai_confidence'
  ];
  
  const lines = [headers.join(',')];
  
  results.forEach(result => {
    const row = [
      escapeCSVField(result.name),
      escapeCSVField(result.company),
      result.score.toString(),
      result.intent,
      result.rule_breakdown.total_rule_score.toString(),
      result.rule_breakdown.role_score.toString(),
      result.rule_breakdown.industry_score.toString(),
      result.rule_breakdown.completeness_score.toString(),
      result.ai_analysis.score.toString(),
      result.ai_analysis.intent,
      (result.ai_analysis.confidence || 0).toFixed(2)
    ];
    
    lines.push(row.join(','));
  });
  
  return lines.join('\n');
}

/**
 * Validates CSV export configuration
 * 
 * Ensures export configuration is valid and provides
 * warnings for potential issues.
 * 
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateCSVConfig(config: Partial<CSVExportConfig>): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check separator
  if (config.separator && config.separator.length !== 1) {
    warnings.push('Separator should be a single character');
    suggestions.push('Use "," or ";" or "|" as separator');
  }
  
  // Check reasoning length
  if (config.maxReasoningLength && config.maxReasoningLength < 50) {
    warnings.push('Very short reasoning length may truncate important information');
    suggestions.push('Consider using at least 100 characters for reasoning');
  }
  
  if (config.maxReasoningLength && config.maxReasoningLength > 500) {
    warnings.push('Very long reasoning length may create unwieldy CSV files');
    suggestions.push('Consider limiting reasoning to 200-300 characters');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}