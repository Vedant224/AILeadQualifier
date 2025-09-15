/**
 * Rule Engine Unit Tests
 * 
 * Comprehensive test suite for the rule-based scoring engine.
 * Tests all scoring components and edge cases to ensure
 * accurate and consistent lead scoring.
 */

import { RuleEngine, ROLE_CLASSIFICATIONS, INDUSTRY_MAPPINGS } from '../services/ruleEngine';
import { LeadData, OfferPayload } from '../models';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  
  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });
  
  describe('evaluateRoleRelevance', () => {
    it('should assign 20 points for decision maker roles', () => {
      const decisionMakerRoles = [
        'CEO',
        'Chief Technology Officer',
        'VP of Engineering',
        'Director of Marketing',
        'Head of Sales',
        'Founder'
      ];
      
      decisionMakerRoles.forEach(role => {
        const score = ruleEngine.evaluateRoleRelevance(role);
        expect(score).toBe(20);
      });
    });
    
    it('should assign 10 points for influencer roles', () => {
      const influencerRoles = [
        'Senior Manager',
        'Principal Engineer',
        'Lead Developer',
        'Project Manager',
        'Senior Consultant',
        'Staff Engineer'
      ];
      
      influencerRoles.forEach(role => {
        const score = ruleEngine.evaluateRoleRelevance(role);
        expect(score).toBe(10);
      });
    });
    
    it('should assign 0 points for non-decision maker roles', () => {
      const standardRoles = [
        'Software Engineer',
        'Marketing Coordinator',
        'Sales Representative',
        'Junior Developer',
        'Intern'
      ];
      
      standardRoles.forEach(role => {
        const score = ruleEngine.evaluateRoleRelevance(role);
        expect(score).toBe(0);
      });
    });
    
    it('should handle case insensitive role matching', () => {
      expect(ruleEngine.evaluateRoleRelevance('ceo')).toBe(20);
      expect(ruleEngine.evaluateRoleRelevance('CEO')).toBe(20);
      expect(ruleEngine.evaluateRoleRelevance('Chief Executive Officer')).toBe(20);
      expect(ruleEngine.evaluateRoleRelevance('senior manager')).toBe(10);
      expect(ruleEngine.evaluateRoleRelevance('SENIOR MANAGER')).toBe(10);
    });
    
    it('should handle invalid role data gracefully', () => {
      expect(ruleEngine.evaluateRoleRelevance('')).toBe(0);
      expect(ruleEngine.evaluateRoleRelevance(null as any)).toBe(0);
      expect(ruleEngine.evaluateRoleRelevance(undefined as any)).toBe(0);
      expect(ruleEngine.evaluateRoleRelevance(123 as any)).toBe(0);
    });
  });
  
  describe('evaluateIndustryMatch', () => {
    const sampleUseCases = ['B2B SaaS mid-market', 'Technology companies', 'Software development'];
    
    it('should assign 20 points for exact industry matches', () => {
      const exactMatches = [
        'Technology',
        'Software',
        'SaaS',
        'B2B'
      ];
      
      exactMatches.forEach(industry => {
        const score = ruleEngine.evaluateIndustryMatch(industry, sampleUseCases);
        expect(score).toBe(20);
      });
    });
    
    it('should assign 10 points for adjacent industry matches', () => {
      // Technology category matches
      const techIndustries = ['Fintech', 'Edtech', 'AI', 'Cybersecurity'];
      
      techIndustries.forEach(industry => {
        const score = ruleEngine.evaluateIndustryMatch(industry, ['Technology solutions']);
        expect(score).toBe(10);
      });
    });
    
    it('should assign 0 points for no industry matches', () => {
      const nonMatchingIndustries = [
        'Agriculture',
        'Mining',
        'Oil & Gas',
        'Textiles'
      ];
      
      nonMatchingIndustries.forEach(industry => {
        const score = ruleEngine.evaluateIndustryMatch(industry, sampleUseCases);
        expect(score).toBe(0);
      });
    });
    
    it('should handle case insensitive industry matching', () => {
      expect(ruleEngine.evaluateIndustryMatch('technology', ['Technology companies'])).toBe(20);
      expect(ruleEngine.evaluateIndustryMatch('TECHNOLOGY', ['technology companies'])).toBe(20);
      expect(ruleEngine.evaluateIndustryMatch('Software', ['software development'])).toBe(20);
    });
    
    it('should handle invalid industry data gracefully', () => {
      expect(ruleEngine.evaluateIndustryMatch('', sampleUseCases)).toBe(0);
      expect(ruleEngine.evaluateIndustryMatch(null as any, sampleUseCases)).toBe(0);
      expect(ruleEngine.evaluateIndustryMatch('Technology', [])).toBe(0);
      expect(ruleEngine.evaluateIndustryMatch('Technology', null as any)).toBe(0);
    });
  });
  
  describe('evaluateDataCompleteness', () => {
    const completeLeadData: LeadData = {
      name: 'John Doe',
      role: 'CEO',
      company: 'Tech Corp',
      industry: 'Technology',
      location: 'San Francisco, CA',
      linkedin_bio: 'Experienced technology executive with 15 years in SaaS.'
    };
    
    it('should assign 10 points for complete data', () => {
      const score = ruleEngine.evaluateDataCompleteness(completeLeadData);
      expect(score).toBe(10);
    });
    
    it('should assign 0 points for missing fields', () => {
      const incompleteData = { ...completeLeadData };
      delete (incompleteData as any).name;
      
      const score = ruleEngine.evaluateDataCompleteness(incompleteData as LeadData);
      expect(score).toBe(0);
    });
    
    it('should assign 0 points for empty fields', () => {
      const emptyFieldData = {
        ...completeLeadData,
        role: ''
      };
      
      const score = ruleEngine.evaluateDataCompleteness(emptyFieldData);
      expect(score).toBe(0);
    });
    
    it('should assign 0 points for whitespace-only fields', () => {
      const whitespaceData = {
        ...completeLeadData,
        company: '   '
      };
      
      const score = ruleEngine.evaluateDataCompleteness(whitespaceData);
      expect(score).toBe(0);
    });
    
    it('should handle invalid lead data gracefully', () => {
      expect(ruleEngine.evaluateDataCompleteness(null as any)).toBe(0);
      expect(ruleEngine.evaluateDataCompleteness(undefined as any)).toBe(0);
      expect(ruleEngine.evaluateDataCompleteness({} as LeadData)).toBe(0);
    });
  });
  
  describe('calculateRuleScore', () => {
    const sampleOffer: OfferPayload = {
      name: 'AI Outreach Automation',
      value_props: ['24/7 outreach', '6x more meetings'],
      ideal_use_cases: ['B2B SaaS mid-market', 'Technology companies']
    };
    
    it('should calculate maximum score for perfect lead', () => {
      const perfectLead: LeadData = {
        name: 'Jane Smith',
        role: 'CEO',
        company: 'SaaS Startup',
        industry: 'Technology',
        location: 'New York, NY',
        linkedin_bio: 'CEO of fast-growing B2B SaaS company serving mid-market clients.'
      };
      
      const breakdown = ruleEngine.calculateRuleScore(perfectLead, sampleOffer);
      
      expect(breakdown.role_score).toBe(20);
      expect(breakdown.industry_score).toBe(20);
      expect(breakdown.completeness_score).toBe(10);
      expect(breakdown.total_rule_score).toBe(50);
    });
    
    it('should calculate minimum score for poor lead', () => {
      const poorLead: LeadData = {
        name: 'Bob Johnson',
        role: 'Intern',
        company: 'Agriculture Corp',
        industry: 'Farming',
        location: '',
        linkedin_bio: 'Recent graduate looking for opportunities.'
      };
      
      const breakdown = ruleEngine.calculateRuleScore(poorLead, sampleOffer);
      
      expect(breakdown.role_score).toBe(0);
      expect(breakdown.industry_score).toBe(0);
      expect(breakdown.completeness_score).toBe(0);
      expect(breakdown.total_rule_score).toBe(0);
    });
    
    it('should calculate partial scores correctly', () => {
      const partialLead: LeadData = {
        name: 'Alice Brown',
        role: 'Senior Manager',
        company: 'Consulting Firm',
        industry: 'Business Services',
        location: 'Chicago, IL',
        linkedin_bio: 'Senior manager with expertise in business transformation.'
      };
      
      const breakdown = ruleEngine.calculateRuleScore(partialLead, sampleOffer);
      
      expect(breakdown.role_score).toBe(10); // Influencer role
      expect(breakdown.industry_score).toBe(0); // No industry match
      expect(breakdown.completeness_score).toBe(10); // Complete data
      expect(breakdown.total_rule_score).toBe(20);
    });
    
    it('should handle errors gracefully and return zero scores', () => {
      const invalidLead = null as any;
      const invalidOffer = null as any;
      
      const breakdown = ruleEngine.calculateRuleScore(invalidLead, invalidOffer);
      
      expect(breakdown.role_score).toBe(0);
      expect(breakdown.industry_score).toBe(0);
      expect(breakdown.completeness_score).toBe(0);
      expect(breakdown.total_rule_score).toBe(0);
    });
  });
  
  describe('Industry Category Mapping', () => {
    it('should correctly categorize technology industries', () => {
      const techIndustries = ['Software', 'SaaS', 'Fintech', 'AI', 'Cybersecurity'];
      
      techIndustries.forEach(industry => {
        // Test through industry matching with tech use case
        const score = ruleEngine.evaluateIndustryMatch(industry, ['Technology solutions']);
        expect(score).toBeGreaterThan(0); // Should get some points for tech category
      });
    });
    
    it('should correctly categorize business services', () => {
      const businessIndustries = ['Consulting', 'Legal', 'Accounting', 'HR'];
      
      businessIndustries.forEach(industry => {
        const score = ruleEngine.evaluateIndustryMatch(industry, ['Business services']);
        expect(score).toBeGreaterThan(0);
      });
    });
  });
});