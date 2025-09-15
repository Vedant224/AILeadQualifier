/**
 * Rule-Based Scoring Engine
 * 
 * Implements deterministic scoring rules for lead qualification.
 * Provides transparent, configurable scoring based on role relevance,
 * industry matching, and data completeness.
 */

import { LeadData, RuleScoreBreakdown, OfferPayload } from '../models';
import { logError } from '../utils/errors';

/**
 * Role classification mapping
 * 
 * Maps job titles and roles to their decision-making influence level.
 * Used to determine role relevance scoring.
 */
export const ROLE_CLASSIFICATIONS = {
  /** Decision makers - highest scoring roles (20 points) */
  DECISION_MAKERS: [
    // C-Level executives
    'ceo', 'chief executive officer', 'president', 'founder', 'co-founder',
    'cto', 'chief technology officer', 'chief technical officer',
    'cfo', 'chief financial officer', 'chief finance officer',
    'cmo', 'chief marketing officer', 'chief marketing',
    'coo', 'chief operating officer', 'chief operations officer',
    'cpo', 'chief product officer', 'chief people officer',
    'ciso', 'chief information security officer',
    'cdo', 'chief data officer', 'chief digital officer',
    
    // VPs and Directors
    'vp', 'vice president', 'svp', 'senior vice president', 'evp', 'executive vice president',
    'director', 'head of', 'general manager', 'gm',
    
    // Department heads
    'owner', 'partner', 'managing director', 'managing partner',
    'department head', 'team lead', 'team leader'
  ],
  
  /** Influencers - moderate scoring roles (10 points) */
  INFLUENCERS: [
    // Senior roles
    'senior manager', 'sr manager', 'senior', 'sr.',
    'principal', 'lead', 'senior lead', 'staff',
    'senior engineer', 'senior developer', 'senior analyst',
    'senior consultant', 'senior specialist',
    
    // Management roles
    'manager', 'supervisor', 'coordinator', 'administrator',
    'project manager', 'program manager', 'product manager',
    'account manager', 'sales manager', 'marketing manager',
    
    // Specialized roles with influence
    'architect', 'consultant', 'specialist', 'expert',
    'analyst', 'strategist', 'advisor'
  ]
} as const;

/**
 * Industry matching configuration
 * 
 * Maps industry sectors to their relevance for different use cases.
 * Supports exact matches and adjacent industry classification.
 */
export const INDUSTRY_MAPPINGS = {
  /** Technology and software industries */
  TECHNOLOGY: [
    'technology', 'tech', 'software', 'saas', 'it', 'information technology',
    'computer software', 'internet', 'telecommunications', 'fintech',
    'edtech', 'healthtech', 'proptech', 'martech', 'adtech',
    'artificial intelligence', 'ai', 'machine learning', 'ml',
    'cybersecurity', 'security', 'cloud computing', 'devops'
  ],
  
  /** Business services and consulting */
  BUSINESS_SERVICES: [
    'consulting', 'business services', 'professional services',
    'management consulting', 'strategy consulting', 'advisory',
    'accounting', 'legal', 'law', 'marketing', 'advertising',
    'public relations', 'pr', 'human resources', 'hr', 'recruiting'
  ],
  
  /** Financial services */
  FINANCIAL: [
    'financial services', 'banking', 'finance', 'investment',
    'insurance', 'real estate', 'venture capital', 'vc',
    'private equity', 'asset management', 'wealth management'
  ],
  
  /** Healthcare and life sciences */
  HEALTHCARE: [
    'healthcare', 'health', 'medical', 'pharmaceutical', 'pharma',
    'biotechnology', 'biotech', 'life sciences', 'hospital',
    'clinic', 'medical device', 'telemedicine'
  ],
  
  /** E-commerce and retail */
  ECOMMERCE: [
    'e-commerce', 'ecommerce', 'retail', 'consumer goods',
    'marketplace', 'online retail', 'fashion', 'apparel'
  ],
  
  /** Manufacturing and industrial */
  MANUFACTURING: [
    'manufacturing', 'industrial', 'automotive', 'aerospace',
    'construction', 'engineering', 'logistics', 'supply chain'
  ],
  
  /** Media and entertainment */
  MEDIA: [
    'media', 'entertainment', 'publishing', 'gaming',
    'streaming', 'content', 'digital media', 'social media'
  ],
  
  /** Education */
  EDUCATION: [
    'education', 'university', 'school', 'training',
    'e-learning', 'online education', 'academic'
  ]
} as const;

/**
 * Rule-based scoring engine implementation
 * 
 * Provides methods for evaluating leads against deterministic rules
 * with transparent scoring and detailed breakdown reporting.
 */
export class RuleEngine {
  /**
   * Evaluates role relevance for a lead
   * 
   * Analyzes the lead's job title/role to determine their decision-making
   * influence and assigns points accordingly.
   * 
   * @param role - Job title or role from lead data
   * @returns Score points (0, 10, or 20)
   */
  evaluateRoleRelevance(role: string): number {
    try {
      if (!role || typeof role !== 'string') {
        console.warn('⚠️ Invalid role data for scoring:', role);
        return 0;
      }
      
      // Normalize role for comparison
      const normalizedRole = role.toLowerCase().trim();
      
      // Check for decision maker roles (20 points)
      const isDecisionMaker = ROLE_CLASSIFICATIONS.DECISION_MAKERS.some(dmRole =>
        normalizedRole.includes(dmRole.toLowerCase())
      );
      
      if (isDecisionMaker) {
        console.log(`✅ Decision maker role detected: "${role}" (+20 points)`);
        return 20;
      }
      
      // Check for influencer roles (10 points)
      const isInfluencer = ROLE_CLASSIFICATIONS.INFLUENCERS.some(infRole =>
        normalizedRole.includes(infRole.toLowerCase())
      );
      
      if (isInfluencer) {
        console.log(`📈 Influencer role detected: "${role}" (+10 points)`);
        return 10;
      }
      
      // No match found (0 points)
      console.log(`📊 Standard role: "${role}" (+0 points)`);
      return 0;
      
    } catch (error) {
      logError(error, 'role_evaluation');
      return 0;
    }
  }
  
  /**
   * Evaluates industry match against offer use cases
   * 
   * Compares the lead's industry with the offer's ideal use cases
   * to determine industry relevance and assign points.
   * 
   * @param industry - Industry from lead data
   * @param idealUseCases - Ideal use cases from offer data
   * @returns Score points (0, 10, or 20)
   */
  evaluateIndustryMatch(industry: string, idealUseCases: string[]): number {
    try {
      if (!industry || typeof industry !== 'string') {
        console.warn('⚠️ Invalid industry data for scoring:', industry);
        return 0;
      }
      
      if (!idealUseCases || !Array.isArray(idealUseCases) || idealUseCases.length === 0) {
        console.warn('⚠️ No ideal use cases provided for industry matching');
        return 0;
      }
      
      // Normalize industry and use cases for comparison
      const normalizedIndustry = industry.toLowerCase().trim();
      const normalizedUseCases = idealUseCases.map(useCase => 
        useCase.toLowerCase().trim()
      );
      
      // Check for exact matches (20 points)
      const hasExactMatch = normalizedUseCases.some(useCase =>
        useCase.includes(normalizedIndustry) || normalizedIndustry.includes(useCase)
      );
      
      if (hasExactMatch) {
        console.log(`🎯 Exact industry match: "${industry}" (+20 points)`);
        return 20;
      }
      
      // Check for adjacent industry matches (10 points)
      const industryCategory = this.getIndustryCategory(normalizedIndustry);
      const useCaseCategories = normalizedUseCases.map(useCase => 
        this.getIndustryCategory(useCase)
      ).filter(category => category !== null);
      
      const hasAdjacentMatch = industryCategory && useCaseCategories.includes(industryCategory);
      
      if (hasAdjacentMatch) {
        console.log(`🔗 Adjacent industry match: "${industry}" in ${industryCategory} (+10 points)`);
        return 10;
      }
      
      // No match found (0 points)
      console.log(`📊 No industry match: "${industry}" (+0 points)`);
      return 0;
      
    } catch (error) {
      logError(error, 'industry_evaluation');
      return 0;
    }
  }
  
  /**
   * Evaluates data completeness for a lead
   * 
   * Checks if all required fields are present and non-empty
   * to ensure data quality for scoring.
   * 
   * @param lead - Lead data to evaluate
   * @returns Score points (0 or 10)
   */
  evaluateDataCompleteness(lead: LeadData): number {
    try {
      if (!lead || typeof lead !== 'object') {
        console.warn('⚠️ Invalid lead data for completeness check:', lead);
        return 0;
      }
      
      // Required fields for completeness
      const requiredFields: (keyof LeadData)[] = [
        'name', 'role', 'company', 'industry', 'location', 'linkedin_bio'
      ];
      
      // Check each required field
      const missingFields: string[] = [];
      const emptyFields: string[] = [];
      
      for (const field of requiredFields) {
        const value = lead[field];
        
        if (value === undefined || value === null) {
          missingFields.push(field);
        } else if (typeof value === 'string' && value.trim().length === 0) {
          emptyFields.push(field);
        }
      }
      
      // Log completeness details
      if (missingFields.length > 0) {
        console.log(`❌ Missing fields: ${missingFields.join(', ')} (+0 points)`);
        return 0;
      }
      
      if (emptyFields.length > 0) {
        console.log(`⚠️ Empty fields: ${emptyFields.join(', ')} (+0 points)`);
        return 0;
      }
      
      console.log(`✅ Complete data for ${lead.name} (+10 points)`);
      return 10;
      
    } catch (error) {
      logError(error, 'completeness_evaluation');
      return 0;
    }
  }
  
  /**
   * Calculates complete rule-based score for a lead
   * 
   * Combines all rule evaluations into a comprehensive score
   * with detailed breakdown for transparency.
   * 
   * @param lead - Lead data to score
   * @param offer - Offer context for scoring
   * @returns Complete rule score breakdown
   */
  calculateRuleScore(lead: LeadData, offer: OfferPayload): RuleScoreBreakdown {
    try {
      console.log(`🔍 Calculating rule score for: ${lead.name} (${lead.company})`);
      
      // Evaluate each scoring component
      const roleScore = this.evaluateRoleRelevance(lead.role);
      const industryScore = this.evaluateIndustryMatch(lead.industry, offer.ideal_use_cases);
      const completenessScore = this.evaluateDataCompleteness(lead);
      
      // Calculate total rule score
      const totalRuleScore = roleScore + industryScore + completenessScore;
      
      const breakdown: RuleScoreBreakdown = {
        role_score: roleScore,
        industry_score: industryScore,
        completeness_score: completenessScore,
        total_rule_score: totalRuleScore
      };
      
      console.log(`📊 Rule score breakdown for ${lead.name}:`, breakdown);
      
      return breakdown;
      
    } catch (error) {
      logError(error, 'rule_score_calculation');
      
      // Return zero score on error
      return {
        role_score: 0,
        industry_score: 0,
        completeness_score: 0,
        total_rule_score: 0
      };
    }
  }
  
  /**
   * Gets industry category for a given industry string
   * 
   * Maps industry names to broader categories for adjacent matching.
   * 
   * @param industry - Industry string to categorize
   * @returns Industry category or null if no match
   */
  private getIndustryCategory(industry: string): string | null {
    const normalizedIndustry = industry.toLowerCase();
    
    for (const [category, industries] of Object.entries(INDUSTRY_MAPPINGS)) {
      if (industries.some(ind => normalizedIndustry.includes(ind.toLowerCase()))) {
        return category;
      }
    }
    
    return null;
  }
}

/**
 * Singleton instance of the rule engine
 * 
 * Provides consistent rule evaluation across the application
 * while maintaining configuration and state.
 */
export const ruleEngine = new RuleEngine();