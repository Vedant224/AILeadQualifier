/**
 * AI Service Unit Tests
 * 
 * Comprehensive test suite for AI service integration including
 * response parsing, error handling, and fallback mechanisms.
 */

import { AIService, createAIService } from '../services/aiService';
import { LeadData, OfferPayload, IntentLevel } from '../models';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

describe('AIService', () => {
  let aiService: AIService;
  let mockModel: any;
  
  const sampleLead: LeadData = {
    name: 'John Doe',
    role: 'CEO',
    company: 'Tech Corp',
    industry: 'Technology',
    location: 'San Francisco, CA',
    linkedin_bio: 'Experienced technology executive with 15 years in SaaS.'
  };
  
  const sampleOffer: OfferPayload = {
    name: 'AI Outreach Automation',
    value_props: ['24/7 outreach', '6x more meetings'],
    ideal_use_cases: ['B2B SaaS mid-market', 'Technology companies']
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock model
    mockModel = {
      generateContent: jest.fn()
    };
    
    // Mock the GoogleGenerativeAI constructor
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    }));
    
    // Create AI service instance
    const config = {
      apiKey: 'test-api-key',
      model: 'gemini-pro',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 100
    };
    
    aiService = new AIService(config);
  });
  
  describe('analyzeIntent', () => {
    it('should successfully analyze intent with valid AI response', async () => {
      // Mock successful AI response
      const mockResponse = {
        response: {
          text: () => 'Intent: High\nReasoning: CEO of technology company with excellent product fit and clear decision authority.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('High');
      expect(result.score).toBe(50);
      expect(result.reasoning).toContain('CEO of technology company');
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
    });
    
    it('should handle medium intent classification', async () => {
      const mockResponse = {
        response: {
          text: () => 'Intent: Medium\nReasoning: Manager role with some decision influence in relevant industry.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('Medium');
      expect(result.score).toBe(30);
      expect(result.reasoning).toContain('Manager role');
    });
    
    it('should handle low intent classification', async () => {
      const mockResponse = {
        response: {
          text: () => 'Intent: Low\nReasoning: Individual contributor with limited decision authority.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('Low');
      expect(result.score).toBe(10);
      expect(result.reasoning).toContain('Individual contributor');
    });
    
    it('should parse AI response with alternative formats', async () => {
      // Test response without explicit "Intent:" and "Reasoning:" labels
      const mockResponse = {
        response: {
          text: () => 'This lead shows high potential due to their CEO role and technology background. They are very likely to be interested in AI automation solutions.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('High'); // Should detect "high" keyword
      expect(result.score).toBe(50);
      expect(result.reasoning).toBeTruthy();
    });
    
    it('should retry on AI service failures', async () => {
      // First call fails, second succeeds
      mockModel.generateContent
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce({
          response: {
            text: () => 'Intent: High\nReasoning: Strong indicators for high intent.'
          }
        });
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('High');
      expect(mockModel.generateContent).toHaveBeenCalledTimes(2);
    });
    
    it('should use fallback analysis after max retries', async () => {
      // All retries fail
      mockModel.generateContent.mockRejectedValue(new Error('Service unavailable'));
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      // Should return fallback analysis
      expect(result.intent).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasoning).toContain('AI service unavailable');
      expect(result.confidence).toBeLessThan(0.5); // Low confidence for fallback
      expect(mockModel.generateContent).toHaveBeenCalledTimes(2); // maxRetries
    });
    
    it('should handle empty AI responses', async () => {
      const mockResponse = {
        response: {
          text: () => ''
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      // Should use fallback
      expect(result.intent).toBeDefined();
      expect(result.reasoning).toContain('AI service unavailable');
    });
    
    it('should handle malformed AI responses gracefully', async () => {
      const mockResponse = {
        response: {
          text: () => 'This is a completely unstructured response without intent classification.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      // Should default to Low intent when parsing fails
      expect(result.intent).toBe('Low');
      expect(result.score).toBe(10);
      expect(result.reasoning).toBeTruthy();
    });
    
    it('should estimate confidence based on response content', async () => {
      // High confidence response
      const highConfidenceResponse = {
        response: {
          text: () => 'Intent: High\nReasoning: Clearly an excellent fit with strong decision authority and perfect industry alignment.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(highConfidenceResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.confidence).toBeGreaterThan(0.6);
    });
    
    it('should handle timeout scenarios', async () => {
      // Mock a slow response that exceeds timeout
      mockModel.generateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );
      
      // This should timeout and use fallback
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.reasoning).toContain('AI service unavailable');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
  
  describe('testConnectivity', () => {
    it('should return connected status on successful test', async () => {
      const mockResponse = {
        response: {
          text: () => 'OK'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.testConnectivity();
      
      expect(result.connected).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });
    
    it('should return disconnected status on failure', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Connection failed'));
      
      const result = await aiService.testConnectivity();
      
      expect(result.connected).toBe(false);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.error).toBe('Connection failed');
    });
  });
  
  describe('createAIService', () => {
    beforeEach(() => {
      // Mock environment variable
      process.env.GEMINI_API_KEY = 'test-api-key';
    });
    
    afterEach(() => {
      delete process.env.GEMINI_API_KEY;
    });
    
    it('should create AI service with environment configuration', () => {
      const service = createAIService();
      expect(service).toBeInstanceOf(AIService);
    });
    
    it('should throw error when API key is missing', () => {
      delete process.env.GEMINI_API_KEY;
      
      expect(() => createAIService()).toThrow('GEMINI_API_KEY environment variable is required');
    });
  });
  
  describe('Response Parsing Edge Cases', () => {
    it('should handle case-insensitive intent matching', async () => {
      const mockResponse = {
        response: {
          text: () => 'intent: high\nreasoning: strong fit detected'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('High');
    });
    
    it('should extract reasoning from various formats', async () => {
      const mockResponse = {
        response: {
          text: () => 'The lead shows high intent. This is because they have excellent qualifications and strong industry fit.'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.reasoning).toContain('excellent qualifications');
    });
    
    it('should handle responses with multiple intent mentions', async () => {
      const mockResponse = {
        response: {
          text: () => 'While they might have low initial interest, their high-level role suggests high intent overall. Intent: High'
        }
      };
      
      mockModel.generateContent.mockResolvedValue(mockResponse);
      
      const result = await aiService.analyzeIntent(sampleLead, sampleOffer);
      
      expect(result.intent).toBe('High'); // Should use the explicit "Intent: High"
    });
  });
});