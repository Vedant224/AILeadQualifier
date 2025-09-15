/**
 * Lead Scoring Service
 * 
 * Orchestrates the complete lead scoring process by combining
 * rule-based scoring with AI-powered intent analysis to generate
 * comprehensive lead qualification scores.
 */

import { LeadData, OfferPayload, ScoredLead, AIAnalysis, RuleScoreBreakdown, IntentLevel } from '../models';
import { ruleEngine } from './ruleEngine';
import { getAIService } from './aiService';
import { logError, withErrorHandling } from '../utils/errors';
import { generateIntentAnalysisPrompt } from '../utils/prompts';

/**
 * Scoring configuration options
 */
interface ScoringConfig {
  /** Whether to use AI analysis (can be disabled for testing) */
  useAI: boolean;
  
  /** Timeout for AI analysis in milliseconds */
  aiTimeout: number;
  
  /** Whether to continue scoring if AI fails */
  continueOnAIFailure: boolean;
  
  /** Parallel processing batch size */
  batchSize: number;
}

/**
 * Default scoring configuration
 */
const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  useAI: true,
  aiTimeout: 30000, // 30 seconds
  continueOnAIFailure: true,
  batchSize: 5 // Process 5 leads at a time
};

/**
 * Scoring statistics for monitoring
 */
export interface ScoringStats {
  /** Total leads processed */
  totalLeads: number;
  
  /** Successfully scored leads */
  successfulScores: number;
  
  /** Failed scoring attempts */
  failedScores: number;
  
  /** AI analysis successes */
  aiSuccesses: number;
  
  /** AI analysis failures */
  aiFailures: number;
  
  /** Average processing time per lead */
  avgProcessingTimeMs: number;
  
  /** Score distribution */
  scoreDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  
  /** Processing start and end times */
  startTime: Date;
  endTime?: Date;
}

/**
 * Lead Scoring Service
 * 
 * Provides comprehensive lead scoring by combining rule-based
 * evaluation with AI-powered intent analysis.
 */
export class ScoringService {
  private config: ScoringConfig;
  private stats: ScoringStats;
  
  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
    this.stats = this.initializeStats();
  }
  
  /**
   * Scores a single lead using combined rule and AI analysis
   * 
   * Applies both rule-based scoring and AI intent analysis
   * to generate a comprehensive lead score with detailed breakdown.
   * 
   * @param lead - Lead data to score
   * @param offer - Offer context for scoring
   * @returns Complete scored lead result
   */
  async scoreLead(lead: LeadData, offer: OfferPayload): Promise<ScoredLead> {
    return withErrorHandling(async () => {
      const startTime = Date.now();
      
      console.log(`🎯 Scoring lead: ${lead.name} (${lead.company})`);
      
      // Step 1: Calculate rule-based score
      const ruleBreakdown = ruleEngine.calculateRuleScore(lead, offer);
      
      // Step 2: Get AI analysis
      let aiAnalysis: AIAnalysis;
      
      if (this.config.useAI) {
        try {
          const aiService = getAIService();
          aiAnalysis = await this.performAIAnalysis(lead, offer, aiService);
          this.stats.aiSuccesses++;
        } catch (error) {
          logError(error, 'ai_analysis_failure');
          this.stats.aiFailures++;
          
          if (this.config.continueOnAIFailure) {
            aiAnalysis = this.getFallbackAIAnalysis(lead, offer);
            console.warn(`⚠️ Using fallback AI analysis for ${lead.name}`);
          } else {
            throw error;
          }
        }
      } else {
        aiAnalysis = this.getFallbackAIAnalysis(lead, offer);
        console.log(`🔄 AI disabled, using fallback analysis for ${lead.name}`);
      }
      
      // Step 3: Combine scores and create result
      const totalScore = ruleBreakdown.total_rule_score + aiAnalysis.score;
      const finalIntent = this.determineFinalIntent(ruleBreakdown, aiAnalysis);
      const combinedReasoning = this.generateCombinedReasoning(ruleBreakdown, aiAnalysis, lead);
      
      const scoredLead: ScoredLead = {
        ...lead,
        intent: finalIntent,
        score: totalScore,
        reasoning: combinedReasoning,
        rule_breakdown: ruleBreakdown,
        ai_analysis: aiAnalysis,
        scored_at: new Date()
      };
      
      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(scoredLead, processingTime, true);
      
      console.log(`✅ Lead scored: ${lead.name} - ${finalIntent} (${totalScore}/100) in ${processingTime}ms`);
      
      return scoredLead;
      
    }, 'lead_scoring')();
  }
  
  /**
   * Scores multiple leads in batches
   * 
   * Processes multiple leads efficiently using batch processing
   * to optimize AI service usage and performance.
   * 
   * @param leads - Array of leads to score
   * @param offer - Offer context for scoring
   * @returns Array of scored leads
   */
  async scoreLeads(leads: LeadData[], offer: OfferPayload): Promise<ScoredLead[]> {
    return withErrorHandling(async () => {
      console.log(`🚀 Starting batch scoring for ${leads.length} leads`);
      
      this.stats = this.initializeStats();
      this.stats.totalLeads = leads.length;
      this.stats.startTime = new Date();
      
      const results: ScoredLead[] = [];
      const errors: Array<{ lead: LeadData; error: Error }> = [];
      
      // Process leads in batches
      for (let i = 0; i < leads.length; i += this.config.batchSize) {
        const batch = leads.slice(i, i + this.config.batchSize);
        const batchNumber = Math.floor(i / this.config.batchSize) + 1;
        const totalBatches = Math.ceil(leads.length / this.config.batchSize);
        
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} leads)`);
        
        // Process batch with parallel execution
        const batchPromises = batch.map(async (lead) => {
          try {
            return await this.scoreLead(lead, offer);
          } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown scoring error');
            errors.push({ lead, error: err });
            logError(err, `lead_scoring_batch_${batchNumber}`);
            
            // Return a minimal scored lead with error indication
            return this.createErrorScoredLead(lead, err);
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to avoid overwhelming AI service
        if (i + this.config.batchSize < leads.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.stats.endTime = new Date();
      
      // Log final statistics
      this.logFinalStats(errors);
      
      return results;
      
    }, 'batch_lead_scoring')();
  }
  
  /**
   * Performs AI analysis with timeout and error handling
   * 
   * @param lead - Lead to analyze
   * @param offer - Offer context
   * @param aiService - AI service instance
   * @returns AI analysis result
   */
  private async performAIAnalysis(
    lead: LeadData, 
    offer: OfferPayload, 
    aiService: any
  ): Promise<AIAnalysis> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI analysis timeout after ${this.config.aiTimeout}ms`));
      }, this.config.aiTimeout);
    });
    
    // Perform AI analysis with timeout
    const analysisPromise = aiService.analyzeIntent(lead, offer);
    
    return Promise.race([analysisPromise, timeoutPromise]);
  }
  
  /**
   * Generates fallback AI analysis when AI service fails
   * 
   * @param lead - Lead data
   * @param offer - Offer data
   * @returns Fallback AI analysis
   */
  private getFallbackAIAnalysis(lead: LeadData, offer: OfferPayload): AIAnalysis {
    // Simple heuristic-based analysis
    const ruleScore = ruleEngine.calculateRuleScore(lead, offer);
    
    let intent: IntentLevel;
    let reasoning: string;
    
    if (ruleScore.total_rule_score >= 40) {
      intent = 'High';
      reasoning = 'Strong rule-based indicators suggest high buying intent.';
    } else if (ruleScore.total_rule_score >= 20) {
      intent = 'Medium';
      reasoning = 'Moderate rule-based indicators suggest medium buying intent.';
    } else {
      intent = 'Low';
      reasoning = 'Limited rule-based indicators suggest low buying intent.';
    }
    
    return {
      intent,
      reasoning,
      score: this.getAIScoreForIntent(intent),
      confidence: 0.3 // Low confidence for fallback
    };
  }
  
  /**
   * Determines final intent based on rule and AI analysis
   * 
   * @param ruleBreakdown - Rule-based scoring breakdown
   * @param aiAnalysis - AI analysis result
   * @returns Final intent classification
   */
  private determineFinalIntent(
    ruleBreakdown: RuleScoreBreakdown, 
    aiAnalysis: AIAnalysis
  ): IntentLevel {
    // Use AI intent as primary, but consider rule score as validation
    const aiIntent = aiAnalysis.intent;
    const ruleScore = ruleBreakdown.total_rule_score;
    
    // If rule score strongly contradicts AI, adjust accordingly
    if (aiIntent === 'High' && ruleScore < 10) {
      console.log('🔄 Adjusting High AI intent to Medium due to low rule score');
      return 'Medium';
    }
    
    if (aiIntent === 'Low' && ruleScore >= 40) {
      console.log('🔄 Adjusting Low AI intent to Medium due to high rule score');
      return 'Medium';
    }
    
    return aiIntent;
  }
  
  /**
   * Generates combined reasoning from rule and AI analysis
   * 
   * @param ruleBreakdown - Rule scoring breakdown
   * @param aiAnalysis - AI analysis result
   * @param lead - Lead data for context
   * @returns Combined reasoning text
   */
  private generateCombinedReasoning(
    ruleBreakdown: RuleScoreBreakdown,
    aiAnalysis: AIAnalysis,
    lead: LeadData
  ): string {
    const ruleParts: string[] = [];
    
    // Add rule-based reasoning
    if (ruleBreakdown.role_score > 0) {
      const roleLevel = ruleBreakdown.role_score === 20 ? 'decision maker' : 'influencer';
      ruleParts.push(`${roleLevel} role`);
    }
    
    if (ruleBreakdown.industry_score > 0) {
      const matchLevel = ruleBreakdown.industry_score === 20 ? 'excellent' : 'good';
      ruleParts.push(`${matchLevel} industry fit`);
    }
    
    if (ruleBreakdown.completeness_score > 0) {
      ruleParts.push('complete profile data');
    }
    
    // Combine rule and AI reasoning
    let combined = '';
    
    if (ruleParts.length > 0) {
      combined += `Rule-based factors: ${ruleParts.join(', ')}. `;
    }
    
    combined += `AI analysis: ${aiAnalysis.reasoning}`;
    
    return combined;
  }
  
  /**
   * Gets AI score for intent level
   * 
   * @param intent - Intent level
   * @returns Corresponding AI score
   */
  private getAIScoreForIntent(intent: IntentLevel): number {
    const scoreMap = { High: 50, Medium: 30, Low: 10 };
    return scoreMap[intent];
  }
  
  /**
   * Creates error scored lead for failed scoring attempts
   * 
   * @param lead - Original lead data
   * @param error - Error that occurred
   * @returns Minimal scored lead with error indication
   */
  private createErrorScoredLead(lead: LeadData, error: Error): ScoredLead {
    return {
      ...lead,
      intent: 'Low',
      score: 0,
      reasoning: `Scoring failed: ${error.message}`,
      rule_breakdown: {
        role_score: 0,
        industry_score: 0,
        completeness_score: 0,
        total_rule_score: 0
      },
      ai_analysis: {
        intent: 'Low',
        reasoning: 'AI analysis failed',
        score: 0,
        confidence: 0
      },
      scored_at: new Date()
    };
  }
  
  /**
   * Initializes scoring statistics
   * 
   * @returns Initial stats object
   */
  private initializeStats(): ScoringStats {
    return {
      totalLeads: 0,
      successfulScores: 0,
      failedScores: 0,
      aiSuccesses: 0,
      aiFailures: 0,
      avgProcessingTimeMs: 0,
      scoreDistribution: { high: 0, medium: 0, low: 0 },
      startTime: new Date()
    };
  }
  
  /**
   * Updates scoring statistics
   * 
   * @param scoredLead - Scored lead result
   * @param processingTime - Processing time in milliseconds
   * @param success - Whether scoring was successful
   */
  private updateStats(scoredLead: ScoredLead, processingTime: number, success: boolean): void {
    if (success) {
      this.stats.successfulScores++;
      
      // Update score distribution
      const intent = scoredLead.intent.toLowerCase() as keyof typeof this.stats.scoreDistribution;
      this.stats.scoreDistribution[intent]++;
    } else {
      this.stats.failedScores++;
    }
    
    // Update average processing time
    const totalProcessed = this.stats.successfulScores + this.stats.failedScores;
    this.stats.avgProcessingTimeMs = 
      (this.stats.avgProcessingTimeMs * (totalProcessed - 1) + processingTime) / totalProcessed;
  }
  
  /**
   * Logs final scoring statistics
   * 
   * @param errors - Array of errors that occurred
   */
  private logFinalStats(errors: Array<{ lead: LeadData; error: Error }>): void {
    const duration = this.stats.endTime 
      ? this.stats.endTime.getTime() - this.stats.startTime.getTime()
      : 0;
    
    console.log(`📊 Scoring complete - ${this.stats.totalLeads} leads processed in ${duration}ms`);
    console.log(`✅ Success: ${this.stats.successfulScores}, ❌ Failed: ${this.stats.failedScores}`);
    console.log(`🤖 AI: ${this.stats.aiSuccesses} success, ${this.stats.aiFailures} failures`);
    console.log(`📈 Distribution: High=${this.stats.scoreDistribution.high}, Medium=${this.stats.scoreDistribution.medium}, Low=${this.stats.scoreDistribution.low}`);
    console.log(`⏱️ Avg processing time: ${this.stats.avgProcessingTimeMs.toFixed(2)}ms per lead`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} leads had scoring errors:`);
      errors.forEach(({ lead, error }) => {
        console.warn(`  - ${lead.name}: ${error.message}`);
      });
    }
  }
  
  /**
   * Gets current scoring statistics
   * 
   * @returns Current statistics
   */
  getStats(): ScoringStats {
    return { ...this.stats };
  }
}

/**
 * Creates a new scoring service instance
 * 
 * @param config - Optional configuration overrides
 * @returns Configured scoring service
 */
export function createScoringService(config?: Partial<ScoringConfig>): ScoringService {
  return new ScoringService(config);
}