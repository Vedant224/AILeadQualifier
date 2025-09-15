/**
 * Scoring Service Unit Tests
 * 
 * Comprehensive test suite for the lead scoring service including
 * rule-based scoring, AI integration, and batch processing.
 */

import { ScoringService, createScoringService } from '../services/scoringService';
import { LeadData, OfferPayload, ScoredLead } from '../models';
import { ruleEngine } from '../services/ruleEngine';

// Mock the AI service
jest.mock('../services/aiService', () => ({
  getAIService: jest.fn(() => ({
    analyzeIntent: jest.fn()
  }))
}));

describe('ScoringService', () => {
  let scoringService: ScoringService;
  let mockAIService: any;
  
  const sampleOffer: OfferPayload = {
    name: 'AI Outreach Automation',
    value_props: ['24/7 outreach', '6x more meetings'],
    ideal_use_cases: ['B2B SaaS mid-market', 'Technology companies']
  };
  
  const sampleLeads: LeadData[] = [
    {
      name: 'John Doe',
      role: 'CEO',
      company: 'Tech Corp',
      industry: 'Technology',
      location: 'San Francisco, CA',
      linkedin_bio: 'Experienced technology executive with 15 years in SaaS.'
    },
    {
      name: 'Jane Smith',
      role: 'Marketing Manager',
      company: 'Retail Inc',
      industry: 'Retail',
      location: 'New York, NY',
      linkedin_bio: 'Marketing professional focused on customer acquisition.'
    },
    {
      name: 'Bob Johnson',
      role: 'Software Engineer',
      company: 'Startup LLC',
      industry: 'Technology',
      location: 'Austin, TX',
      linkedin_bio: 'Full-stack developer with expertise in web applications.'
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AI service
    const { getAIService } = require('../services/aiService');
    mockAIService = {
      analyzeIntent: jest.fn()
    };
    getAIService.mockReturnValue(mockAIService);
    
    // Create scoring service
    scoringService = createScoringService({
      useAI: true,
      continueOnAIFailure: true,
      batchSize: 2
    });
  });
  
  describe('scoreLead', () => {
    it('should score a single lead with rule and AI analysis', async () => {
      // Mock AI response
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'High',
        reasoning: 'CEO with strong technology background',
        score: 50,
        confidence: 0.9
      });
      
      const result = await scoringService.scoreLead(sampleLeads[0], sampleOffer);
      
      expect(result.name).toBe('John Doe');
      expect(result.intent).toBe('High');
      expect(result.score).toBeGreaterThan(50); // Rule score + AI score
      expect(result.reasoning).toContain('CEO');
      expect(result.rule_breakdown).toBeDefined();
      expect(result.ai_analysis).toBeDefined();
      expect(result.scored_at).toBeInstanceOf(Date);
      
      expect(mockAIService.analyzeIntent).toHaveBeenCalledWith(sampleLeads[0], sampleOffer);
    });
    
    it('should handle AI service failures gracefully', async () => {
      // Mock AI failure
      mockAIService.analyzeIntent.mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await scoringService.scoreLead(sampleLeads[0], sampleOffer);
      
      expect(result.name).toBe('John Doe');
      expect(result.intent).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.ai_analysis.reasoning).toContain('fallback');
      expect(result.ai_analysis.confidence).toBeLessThan(0.5);
    });
    
    it('should calculate correct rule-based scores', async () => {
      // Mock AI response
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'Medium',
        reasoning: 'Some potential',
        score: 30,
        confidence: 0.6
      });
      
      const result = await scoringService.scoreLead(sampleLeads[0], sampleOffer);
      
      // CEO role should get 20 points, Technology industry should match, complete data should get 10
      expect(result.rule_breakdown.role_score).toBe(20);
      expect(result.rule_breakdown.industry_score).toBeGreaterThan(0);
      expect(result.rule_breakdown.completeness_score).toBe(10);
      expect(result.rule_breakdown.total_rule_score).toBeGreaterThan(30);
    });
    
    it('should adjust final intent based on rule score validation', async () => {
      // Mock high AI intent but lead has low rule score
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'High',
        reasoning: 'AI thinks this is high',
        score: 50,
        confidence: 0.8
      });
      
      // Use a lead with low rule score potential
      const lowScoreLead: LeadData = {
        name: 'Low Score Lead',
        role: 'Intern',
        company: 'Unrelated Corp',
        industry: 'Agriculture',
        location: 'Rural Area',
        linkedin_bio: 'Recent graduate'
      };
      
      const result = await scoringService.scoreLead(lowScoreLead, sampleOffer);
      
      // Should adjust High AI intent to Medium due to low rule score
      expect(result.intent).toBe('Medium');
    });
  });
  
  describe('scoreLeads', () => {
    it('should score multiple leads in batches', async () => {
      // Mock AI responses for each lead
      mockAIService.analyzeIntent
        .mockResolvedValueOnce({
          intent: 'High',
          reasoning: 'CEO with tech background',
          score: 50,
          confidence: 0.9
        })
        .mockResolvedValueOnce({
          intent: 'Medium',
          reasoning: 'Manager role with some influence',
          score: 30,
          confidence: 0.7
        })
        .mockResolvedValueOnce({
          intent: 'Low',
          reasoning: 'Individual contributor',
          score: 10,
          confidence: 0.5
        });
      
      const results = await scoringService.scoreLeads(sampleLeads, sampleOffer);
      
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('John Doe');
      expect(results[1].name).toBe('Jane Smith');
      expect(results[2].name).toBe('Bob Johnson');
      
      // Verify all leads were scored
      results.forEach(result => {
        expect(result.score).toBeGreaterThan(0);
        expect(result.intent).toBeDefined();
        expect(result.reasoning).toBeTruthy();
        expect(result.scored_at).toBeInstanceOf(Date);
      });
      
      expect(mockAIService.analyzeIntent).toHaveBeenCalledTimes(3);
    });
    
    it('should handle partial failures in batch processing', async () => {
      // Mock AI responses with one failure
      mockAIService.analyzeIntent
        .mockResolvedValueOnce({
          intent: 'High',
          reasoning: 'Good lead',
          score: 50,
          confidence: 0.9
        })
        .mockRejectedValueOnce(new Error('AI failed for this lead'))
        .mockResolvedValueOnce({
          intent: 'Low',
          reasoning: 'Low potential',
          score: 10,
          confidence: 0.5
        });
      
      const results = await scoringService.scoreLeads(sampleLeads, sampleOffer);
      
      expect(results).toHaveLength(3);
      
      // First and third should succeed, second should use fallback
      expect(results[0].ai_analysis.confidence).toBe(0.9);
      expect(results[1].ai_analysis.confidence).toBeLessThan(0.5); // Fallback
      expect(results[2].ai_analysis.confidence).toBe(0.5);
    });
    
    it('should collect and report statistics', async () => {
      // Mock AI responses
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'Medium',
        reasoning: 'Average lead',
        score: 30,
        confidence: 0.6
      });
      
      await scoringService.scoreLeads(sampleLeads, sampleOffer);
      
      const stats = scoringService.getStats();
      
      expect(stats.totalLeads).toBe(3);
      expect(stats.successfulScores).toBe(3);
      expect(stats.failedScores).toBe(0);
      expect(stats.aiSuccesses).toBe(3);
      expect(stats.aiFailures).toBe(0);
      expect(stats.avgProcessingTimeMs).toBeGreaterThan(0);
      expect(stats.scoreDistribution.medium).toBe(3);
      expect(stats.startTime).toBeInstanceOf(Date);
      expect(stats.endTime).toBeInstanceOf(Date);
    });
    
    it('should process leads in configured batch sizes', async () => {
      // Create service with batch size of 1
      const batchService = createScoringService({ batchSize: 1 });
      
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'Medium',
        reasoning: 'Test lead',
        score: 30,
        confidence: 0.6
      });
      
      const results = await batchService.scoreLeads(sampleLeads, sampleOffer);
      
      expect(results).toHaveLength(3);
      expect(mockAIService.analyzeIntent).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Configuration Options', () => {
    it('should work with AI disabled', async () => {
      const noAIService = createScoringService({ useAI: false });
      
      const result = await noAIService.scoreLead(sampleLeads[0], sampleOffer);
      
      expect(result.ai_analysis.confidence).toBeLessThan(0.5); // Fallback confidence
      expect(mockAIService.analyzeIntent).not.toHaveBeenCalled();
    });
    
    it('should fail fast when continueOnAIFailure is false', async () => {
      const strictService = createScoringService({ 
        useAI: true, 
        continueOnAIFailure: false 
      });
      
      mockAIService.analyzeIntent.mockRejectedValue(new Error('AI failed'));
      
      await expect(strictService.scoreLead(sampleLeads[0], sampleOffer))
        .rejects.toThrow('AI failed');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid lead data gracefully', async () => {
      const invalidLead = null as any;
      
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'Low',
        reasoning: 'Invalid data',
        score: 10,
        confidence: 0.1
      });
      
      const result = await scoringService.scoreLead(invalidLead, sampleOffer);
      
      expect(result.score).toBe(10); // Should get AI score even with invalid rule data
    });
    
    it('should handle invalid offer data gracefully', async () => {
      const invalidOffer = null as any;
      
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'Low',
        reasoning: 'Invalid offer',
        score: 10,
        confidence: 0.1
      });
      
      const result = await scoringService.scoreLead(sampleLeads[0], invalidOffer);
      
      expect(result.score).toBe(10); // Should still get AI score
    });
  });
  
  describe('Integration with Rule Engine', () => {
    it('should use actual rule engine for scoring', async () => {
      // Spy on rule engine
      const calculateRuleScoreSpy = jest.spyOn(ruleEngine, 'calculateRuleScore');
      
      mockAIService.analyzeIntent.mockResolvedValue({
        intent: 'High',
        reasoning: 'Good lead',
        score: 50,
        confidence: 0.8
      });
      
      await scoringService.scoreLead(sampleLeads[0], sampleOffer);
      
      expect(calculateRuleScoreSpy).toHaveBeenCalledWith(sampleLeads[0], sampleOffer);
      
      calculateRuleScoreSpy.mockRestore();
    });
  });
});