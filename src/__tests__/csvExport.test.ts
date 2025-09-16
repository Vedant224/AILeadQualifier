/**
 * CSV Export Utilities Unit Tests
 * 
 * Comprehensive test suite for CSV export functionality including
 * data formatting, escaping, and various export configurations.
 */

import {
  generateCSVFromResults,
  generateSummaryCSV,
  generateBreakdownCSV,
  validateCSVConfig
} from '../utils/csvExport';
import { ScoredLead } from '../models';

describe('CSV Export Utilities', () => {
  // Sample scored lead data for testing
  const sampleScoredLeads: ScoredLead[] = [
    {
      name: 'John Doe',
      role: 'CEO',
      company: 'Tech Corp',
      industry: 'Technology',
      location: 'San Francisco, CA',
      linkedin_bio: 'Experienced technology executive with 15 years in SaaS.',
      uploaded_at: new Date('2024-01-15T10:00:00Z'),
      intent: 'High',
      score: 85,
      reasoning: 'Rule-based factors: decision maker role, excellent industry fit. AI analysis: Strong technology background.',
      rule_breakdown: {
        role_score: 20,
        industry_score: 20,
        completeness_score: 10,
        total_rule_score: 50
      },
      ai_analysis: {
        intent: 'High',
        reasoning: 'CEO with strong technology background',
        score: 50,
        confidence: 0.92
      },
      scored_at: new Date('2024-01-15T10:30:00Z')
    },
    {
      name: 'Jane Smith',
      role: 'Marketing Manager',
      company: 'Retail Inc',
      industry: 'Retail',
      location: 'New York, NY',
      linkedin_bio: 'Marketing professional focused on customer acquisition.',
      uploaded_at: new Date('2024-01-15T10:05:00Z'),
      intent: 'Medium',
      score: 40,
      reasoning: 'Rule-based factors: influencer role. AI analysis: Some potential but limited industry fit.',
      rule_breakdown: {
        role_score: 10,
        industry_score: 0,
        completeness_score: 10,
        total_rule_score: 20
      },
      ai_analysis: {
        intent: 'Medium',
        reasoning: 'Manager role with some influence',
        score: 30,
        confidence: 0.67
      },
      scored_at: new Date('2024-01-15T10:32:00Z')
    },
    {
      name: 'Bob "The Builder" Johnson',
      role: 'Software Engineer',
      company: 'Startup, LLC',
      industry: 'Technology',
      location: 'Austin, TX',
      linkedin_bio: 'Full-stack developer with expertise in web applications.\nPassionate about AI and automation.',
      uploaded_at: new Date('2024-01-15T10:10:00Z'),
      intent: 'Low',
      score: 25,
      reasoning: 'Rule-based factors: complete data, good industry fit. AI analysis: Individual contributor with limited decision authority.',
      rule_breakdown: {
        role_score: 0,
        industry_score: 20,
        completeness_score: 10,
        total_rule_score: 30
      },
      ai_analysis: {
        intent: 'Low',
        reasoning: 'Individual contributor role',
        score: 10,
        confidence: 0.45
      },
      scored_at: new Date('2024-01-15T10:35:00Z')
    }
  ];
  
  describe('generateCSVFromResults', () => {
    it('should generate CSV with default configuration', () => {
      const csv = generateCSVFromResults(sampleScoredLeads);
      
      expect(csv).toContain('name,role,company,industry,location,intent,total_score,reasoning');
      expect(csv).toContain('John Doe,CEO,Tech Corp,Technology');
      expect(csv).toContain('Jane Smith,Marketing Manager,Retail Inc,Retail');
      expect(csv).toContain('"Bob ""The Builder"" Johnson"'); // Proper quote escaping
    });
    
    it('should handle empty results array', () => {
      const csv = generateCSVFromResults([]);
      
      expect(csv).toContain('name,role,company'); // Should still have headers
      expect(csv.split('\n')).toHaveLength(1); // Only header row
    });
    
    it('should include rule breakdown when configured', () => {
      const csv = generateCSVFromResults(sampleScoredLeads, {
        includeRuleBreakdown: true
      });
      
      expect(csv).toContain('rule_total_score,rule_role_score,rule_industry_score,rule_completeness_score');
      expect(csv).toContain('50,20,20,10'); // John Doe's rule breakdown
    });
    
    it('should include AI details when configured', () => {
      const csv = generateCSVFromResults(sampleScoredLeads, {
        includeAIDetails: true
      });
      
      expect(csv).toContain('ai_intent,ai_score,ai_reasoning,ai_confidence');
      expect(csv).toContain('High,50'); // John Doe's AI analysis
      expect(csv).toContain('0.92'); // Confidence score
    });
    
    it('should include timestamps when configured', () => {
      const csv = generateCSVFromResults(sampleScoredLeads, {
        includeTimestamps: true
      });
      
      expect(csv).toContain('uploaded_at,scored_at');
      expect(csv).toContain('2024-01-15T10:00:00.000Z');
      expect(csv).toContain('2024-01-15T10:30:00.000Z');
    });
    
    it('should exclude headers when configured', () => {
      const csv = generateCSVFromResults(sampleScoredLeads, {
        includeHeaders: false
      });
      
      expect(csv).not.toContain('name,role,company');
      expect(csv).toContain('John Doe,CEO,Tech Corp');
    });
    
    it('should use custom separator', () => {
      const csv = generateCSVFromResults(sampleScoredLeads, {
        separator: ';'
      });
      
      expect(csv).toContain('name;role;company;industry');
      expect(csv).toContain('John Doe;CEO;Tech Corp;Technology');
    });
    
    it('should truncate reasoning text when configured', () => {
      const csv = generateCSVFromResults(sampleScoredLeads, {
        maxReasoningLength: 20
      });
      
      // Should truncate long reasoning text
      expect(csv).toContain('Rule-based factors:...');
    });
    
    it('should properly escape CSV special characters', () => {
      const csv = generateCSVFromResults(sampleScoredLeads);
      
      // Check quote escaping
      expect(csv).toContain('"Bob ""The Builder"" Johnson"');
      
      // Check comma escaping
      expect(csv).toContain('"Startup, LLC"');
      
      // Check newline escaping
      expect(csv).toContain('"Full-stack developer with expertise in web applications.\nPassionate about AI and automation."');
    });
  });
  
  describe('generateSummaryCSV', () => {
    it('should generate summary statistics', () => {
      const csv = generateSummaryCSV(sampleScoredLeads);
      
      expect(csv).toContain('metric,value');
      expect(csv).toContain('total_leads,3');
      expect(csv).toContain('high_intent_count,1');
      expect(csv).toContain('medium_intent_count,1');
      expect(csv).toContain('low_intent_count,1');
      expect(csv).toContain('average_score,50.00'); // (85+40+25)/3 = 50
    });
    
    it('should handle empty results', () => {
      const csv = generateSummaryCSV([]);
      
      expect(csv).toContain('metric,value');
      expect(csv).toContain('total_leads,0');
    });
    
    it('should include score range distribution', () => {
      const csv = generateSummaryCSV(sampleScoredLeads);
      
      expect(csv).toContain('score_80_100,1'); // John Doe (85)
      expect(csv).toContain('score_40_59,1'); // Jane Smith (40)
      expect(csv).toContain('score_20_39,1'); // Bob Johnson (25)
    });
    
    it('should include top industries', () => {
      const csv = generateSummaryCSV(sampleScoredLeads);
      
      expect(csv).toContain('top_industries,count');
      expect(csv).toContain('Technology,2'); // John and Bob
      expect(csv).toContain('Retail,1'); // Jane
    });
    
    it('should calculate percentages correctly', () => {
      const csv = generateSummaryCSV(sampleScoredLeads);
      
      expect(csv).toContain('high_intent_percentage,33.3%'); // 1/3 = 33.3%
    });
  });
  
  describe('generateBreakdownCSV', () => {
    it('should generate scoring breakdown', () => {
      const csv = generateBreakdownCSV(sampleScoredLeads);
      
      expect(csv).toContain('name,company,total_score,intent,rule_total,rule_role,rule_industry,rule_completeness,ai_score,ai_intent,ai_confidence');
      expect(csv).toContain('John Doe,Tech Corp,85,High,50,20,20,10,50,High,0.92');
      expect(csv).toContain('Jane Smith,Retail Inc,40,Medium,20,10,0,10,30,Medium,0.67');
    });
    
    it('should handle empty results', () => {
      const csv = generateBreakdownCSV([]);
      
      expect(csv).toContain('name,company,total_score'); // Headers only
      expect(csv.split('\n')).toHaveLength(1);
    });
    
    it('should properly escape company names with special characters', () => {
      const csv = generateBreakdownCSV(sampleScoredLeads);
      
      expect(csv).toContain('"Startup, LLC"'); // Comma-containing company name
    });
  });
  
  describe('validateCSVConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        includeRuleBreakdown: true,
        includeAIDetails: true,
        separator: ',',
        maxReasoningLength: 200
      };
      
      const result = validateCSVConfig(config);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
    
    it('should warn about invalid separator', () => {
      const config = {
        separator: 'invalid'
      };
      
      const result = validateCSVConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('single character'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('Use ","'))).toBe(true);
    });
    
    it('should warn about very short reasoning length', () => {
      const config = {
        maxReasoningLength: 30
      };
      
      const result = validateCSVConfig(config);
      
      expect(result.warnings.some(w => w.includes('Very short reasoning'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('at least 100'))).toBe(true);
    });
    
    it('should warn about very long reasoning length', () => {
      const config = {
        maxReasoningLength: 1000
      };
      
      const result = validateCSVConfig(config);
      
      expect(result.warnings.some(w => w.includes('Very long reasoning'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('200-300'))).toBe(true);
    });
    
    it('should provide helpful suggestions', () => {
      const config = {
        separator: '||',
        maxReasoningLength: 10
      };
      
      const result = validateCSVConfig(config);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('separator'))).toBe(true);
      expect(result.suggestions.some(s => s.includes('reasoning'))).toBe(true);
    });
  });
  
  describe('Edge Cases and Special Characters', () => {
    it('should handle null and undefined values', () => {
      const leadWithNulls: ScoredLead = {
        ...sampleScoredLeads[0],
        location: null as any,
        linkedin_bio: undefined as any
      };
      
      const csv = generateCSVFromResults([leadWithNulls]);
      
      expect(csv).toContain(',,'); // Empty fields for null/undefined
    });
    
    it('should handle very long text fields', () => {
      const leadWithLongText: ScoredLead = {
        ...sampleScoredLeads[0],
        reasoning: 'a'.repeat(1000),
        linkedin_bio: 'b'.repeat(2000)
      };
      
      const csv = generateCSVFromResults([leadWithLongText], {
        maxReasoningLength: 50
      });
      
      expect(csv).toContain('aaa...'); // Truncated reasoning
    });
    
    it('should handle special Unicode characters', () => {
      const unicodeLead: ScoredLead = {
        ...sampleScoredLeads[0],
        name: 'José María González',
        company: 'Société Française 🇫🇷',
        linkedin_bio: 'Développeur avec expérience en IA 🤖'
      };
      
      const csv = generateCSVFromResults([unicodeLead]);
      
      expect(csv).toContain('José María González');
      expect(csv).toContain('Société Française 🇫🇷');
      expect(csv).toContain('🤖');
    });
    
    it('should handle all possible CSV escape scenarios', () => {
      const complexLead: ScoredLead = {
        ...sampleScoredLeads[0],
        name: 'John "Johnny" O\'Malley',
        company: 'Smith, Jones & Associates',
        reasoning: 'Multi-line\nreasoning with "quotes" and, commas\r\nand carriage returns'
      };
      
      const csv = generateCSVFromResults([complexLead]);
      
      // Should properly escape all special characters
      expect(csv).toContain('"John ""Johnny"" O\'Malley"');
      expect(csv).toContain('"Smith, Jones & Associates"');
      expect(csv).toContain('"Multi-line\nreasoning with ""quotes"" and, commas\r\nand carriage returns"');
    });
  });
  
  describe('Performance and Large Data Sets', () => {
    it('should handle large datasets efficiently', () => {
      // Create a large dataset
      const largeDataset: ScoredLead[] = Array(1000).fill(null).map((_, index) => ({
        ...sampleScoredLeads[0],
        name: `Lead ${index}`,
        company: `Company ${index}`,
        score: Math.floor(Math.random() * 100)
      }));
      
      const startTime = Date.now();
      const csv = generateCSVFromResults(largeDataset);
      const endTime = Date.now();
      
      expect(csv).toBeTruthy();
      expect(csv.split('\n')).toHaveLength(1001); // 1000 data rows + 1 header
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
    
    it('should handle memory efficiently with large text fields', () => {
      const leadWithLargeText: ScoredLead = {
        ...sampleScoredLeads[0],
        linkedin_bio: 'x'.repeat(10000),
        reasoning: 'y'.repeat(5000)
      };
      
      const csv = generateCSVFromResults([leadWithLargeText], {
        maxReasoningLength: 100
      });
      
      expect(csv).toBeTruthy();
      expect(csv.length).toBeLessThan(15000); // Should be truncated
    });
  });
});