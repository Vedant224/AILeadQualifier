/**
 * AI Service Integration
 * 
 * Provides integration with Google Gemini AI for lead intent analysis.
 * Handles prompt engineering, response parsing, and error recovery
 * for AI-powered lead scoring components.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LeadData, OfferPayload, AIAnalysis, IntentLevel, AI_SCORE_MAPPING } from '../models';
import { ExternalServiceError, logError, withErrorHandling } from '../utils/errors';

/**
 * AI service configuration
 */
interface AIServiceConfig {
  /** Google Gemini API key */
  apiKey: string;

  /** AI model to use */
  model: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * AI response parsing result
 */
interface ParsedAIResponse {
  /** Extracted intent level */
  intent: IntentLevel;

  /** Extracted reasoning text */
  reasoning: string;

  /** Whether parsing was successful */
  success: boolean;

  /** Raw AI response for debugging */
  rawResponse: string;
}

/**
 * AI Service class for lead intent analysis
 * 
 * Integrates with Google Gemini to analyze lead data and provide
 * intent classification with reasoning for scoring purposes.
 */
export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;

    try {
      // Initialize Google Generative AI client
      this.genAI = new GoogleGenerativeAI(config.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: config.model });

      console.log(`🤖 AI Service initialized with model: ${config.model}`);
    } catch (error) {
      logError(error, 'ai_service_initialization');
      throw new ExternalServiceError(
        'Failed to initialize AI service',
        500,
        { original_error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Analyzes lead intent using AI
   * 
   * Sends lead and offer data to AI for intent classification
   * and reasoning generation with comprehensive error handling.
   * 
   * @param lead - Lead data to analyze
   * @param offer - Offer context for analysis
   * @returns AI analysis result with intent and reasoning
   */
  async analyzeIntent(lead: LeadData, offer: OfferPayload): Promise<AIAnalysis> {
    return withErrorHandling(async () => {
      console.log(`🧠 Analyzing intent for: ${lead.name} (${lead.company})`);

      // Generate prompt for AI analysis
      const prompt = this.generateAnalysisPrompt(lead, offer);

      // Call AI service with retry logic
      const aiResponse = await this.callAIWithRetry(prompt);

      // Parse AI response
      const parsedResponse = this.parseAIResponse(aiResponse);

      if (!parsedResponse.success) {
        console.warn(`⚠️ Failed to parse AI response for ${lead.name}, using fallback`);
        return this.getFallbackAnalysis(lead, offer);
      }

      // Create AI analysis result
      const analysis: AIAnalysis = {
        intent: parsedResponse.intent,
        reasoning: parsedResponse.reasoning,
        score: AI_SCORE_MAPPING[parsedResponse.intent],
        confidence: this.estimateConfidence(parsedResponse.rawResponse)
      };

      console.log(`✅ AI analysis complete for ${lead.name}: ${analysis.intent} (${analysis.score} points)`);

      return analysis;

    }, 'ai_intent_analysis')();
  }

  /**
   * Generates analysis prompt for AI
   * 
   * Creates a structured prompt that provides context about the lead
   * and offer to guide AI analysis toward accurate intent classification.
   * 
   * @param lead - Lead data for context
   * @param offer - Offer data for context
   * @returns Formatted prompt string
   */
  private generateAnalysisPrompt(lead: LeadData, offer: OfferPayload): string {
    return `Analyze this lead for buying intent based on the product offer:

LEAD INFORMATION:
- Name: ${lead.name}
- Role: ${lead.role}
- Company: ${lead.company}
- Industry: ${lead.industry}
- Location: ${lead.location}
- LinkedIn Bio: ${lead.linkedin_bio}

PRODUCT OFFER:
- Product: ${offer.name}
- Value Propositions: ${offer.value_props.join(', ')}
- Ideal Use Cases: ${offer.ideal_use_cases.join(', ')}

TASK:
Classify the lead's buying intent as High, Medium, or Low based on:
1. Role relevance (decision-making authority)
2. Industry fit with the product
3. Company profile alignment with ideal use cases
4. Professional background indicating need/interest

RESPONSE FORMAT:
Intent: [High/Medium/Low]
Reasoning: [1-2 sentences explaining the classification]

CLASSIFICATION GUIDELINES:
- High: Strong decision-making role + excellent industry/company fit + clear need indicators
- Medium: Some decision influence OR good fit but missing key elements
- Low: Limited decision authority + poor fit OR insufficient information

Please provide your analysis:`;
  }

  /**
   * Calls AI service with retry logic
   * 
   * Implements exponential backoff retry strategy for handling
   * temporary AI service failures and rate limiting.
   * 
   * @param prompt - Prompt to send to AI
   * @returns AI response text
   */
  private async callAIWithRetry(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔄 AI request attempt ${attempt}/${this.config.maxRetries}`);

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI request timeout')), this.config.timeout);
        });

        // Make AI request with timeout
        const requestPromise = this.model.generateContent(prompt);

        const result = await Promise.race([requestPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from AI service');
        }

        console.log(`✅ AI request successful on attempt ${attempt}`);
        return text;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown AI service error');

        console.warn(`⚠️ AI request attempt ${attempt} failed:`, lastError.message);

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    throw new ExternalServiceError(
      `AI service failed after ${this.config.maxRetries} attempts`,
      502,
      {
        last_error: lastError?.message,
        attempts: this.config.maxRetries,
        timeout: this.config.timeout
      }
    );
  }

  /**
   * Parses AI response to extract intent and reasoning
   * 
   * Uses pattern matching and text analysis to extract structured
   * data from AI's natural language response.
   * 
   * @param response - Raw AI response text
   * @returns Parsed response with intent and reasoning
   */
  private parseAIResponse(response: string): ParsedAIResponse {
    try {
      const normalizedResponse = response.trim();

      // Extract intent using multiple patterns
      let intent: IntentLevel | null = null;

      // Pattern 1: "Intent: High/Medium/Low"
      const intentMatch = normalizedResponse.match(/Intent:\s*(High|Medium|Low)/i);
      if (intentMatch) {
        intent = intentMatch[1] as IntentLevel;
      }

      // Pattern 2: Look for intent keywords in the response
      if (!intent) {
        if (/\b(high|strong|excellent|very likely)\b/i.test(normalizedResponse)) {
          intent = 'High';
        } else if (/\b(medium|moderate|some|possible)\b/i.test(normalizedResponse)) {
          intent = 'Medium';
        } else if (/\b(low|weak|poor|unlikely)\b/i.test(normalizedResponse)) {
          intent = 'Low';
        }
      }

      // Extract reasoning
      let reasoning = '';

      // Pattern 1: "Reasoning: ..."
      const reasoningMatch = normalizedResponse.match(/Reasoning:\s*(.+?)(?:\n|$)/i);
      if (reasoningMatch && reasoningMatch[1]) {
        reasoning = reasoningMatch[1]?.trim() ?? '';
      }

      // Pattern 2: Take the last sentence or paragraph
      if (!reasoning) {
        const sentences = normalizedResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1];
          reasoning = lastSentence?.trim() ?? '';
        }
      }

      // Fallback: Use first part of response
      if (!reasoning) {
        reasoning = normalizedResponse.substring(0, 200).trim();
      }

      // Validate results
      const validIntents: IntentLevel[] = ['High', 'Medium', 'Low'];
      const isValidIntent = intent !== null && validIntents.includes(intent);
      const hasReasoning = reasoning.length > 0;

      return {
        intent: intent || 'Low', // Default to Low if parsing fails
        reasoning: reasoning || 'AI analysis could not be parsed properly',
        success: Boolean(isValidIntent && hasReasoning),
        rawResponse: normalizedResponse
      };

    } catch (error) {
      logError(error, 'ai_response_parsing');

      return {
        intent: 'Low',
        reasoning: 'Error parsing AI response',
        success: false,
        rawResponse: response
      };
    }
  }

  /**
   * Estimates confidence based on AI response
   * 
   * Analyzes the AI response text to estimate confidence level
   * based on language patterns and certainty indicators.
   * 
   * @param response - AI response text
   * @returns Confidence score (0-1)
   */
  private estimateConfidence(response: string): number {
    try {
      const normalizedResponse = response.toLowerCase();

      // High confidence indicators
      const highConfidenceWords = [
        'clearly', 'definitely', 'obviously', 'certainly', 'strong', 'excellent',
        'perfect', 'ideal', 'exactly', 'precisely'
      ];

      // Low confidence indicators
      const lowConfidenceWords = [
        'might', 'maybe', 'possibly', 'unclear', 'limited', 'insufficient',
        'uncertain', 'difficult', 'hard to determine'
      ];

      let confidenceScore = 0.5; // Base confidence

      // Adjust based on confidence indicators
      highConfidenceWords.forEach(word => {
        if (normalizedResponse.includes(word)) {
          confidenceScore += 0.1;
        }
      });

      lowConfidenceWords.forEach(word => {
        if (normalizedResponse.includes(word)) {
          confidenceScore -= 0.1;
        }
      });

      // Clamp to valid range
      return Math.max(0, Math.min(1, confidenceScore));

    } catch (error) {
      return 0.5; // Default confidence on error
    }
  }

  /**
   * Provides fallback analysis when AI fails
   * 
   * Creates a basic analysis based on simple heuristics
   * when AI service is unavailable or fails to respond.
   * 
   * @param lead - Lead data for fallback analysis
   * @param offer - Offer data for context
   * @returns Fallback AI analysis
   */
  private getFallbackAnalysis(lead: LeadData, offer: OfferPayload): AIAnalysis {
    console.log(`🔄 Using fallback analysis for ${lead.name}`);

    // Simple heuristic-based fallback
    let intent: IntentLevel = 'Low';
    let reasoning = 'AI service unavailable, using basic heuristics.';

    // Check for decision maker roles
    const decisionMakerKeywords = ['ceo', 'cto', 'vp', 'director', 'head', 'chief', 'founder'];
    const isDecisionMaker = decisionMakerKeywords.some(keyword =>
      lead.role.toLowerCase().includes(keyword)
    );

    // Check for industry relevance
    const hasIndustryMatch = offer.ideal_use_cases.some(useCase =>
      useCase.toLowerCase().includes(lead.industry.toLowerCase()) ||
      lead.industry.toLowerCase().includes(useCase.toLowerCase())
    );

    if (isDecisionMaker && hasIndustryMatch) {
      intent = 'High';
      reasoning = 'Decision maker role with relevant industry match.';
    } else if (isDecisionMaker || hasIndustryMatch) {
      intent = 'Medium';
      reasoning = 'Either decision maker role or industry relevance detected.';
    }

    return {
      intent,
      reasoning,
      score: AI_SCORE_MAPPING[intent],
      confidence: 0.3 // Low confidence for fallback
    };
  }

  /**
   * Tests AI service connectivity
   * 
   * Performs a simple test request to verify AI service
   * is accessible and responding correctly.
   * 
   * @returns Promise resolving to connectivity status
   */
  async testConnectivity(): Promise<{ connected: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();

    try {
      const testPrompt = 'Respond with "OK" to confirm connectivity.';
      await this.callAIWithRetry(testPrompt);
      const responseTime = Date.now() - startTime;

      return {
        connected: true,
        responseTime,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        connected: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Creates AI service instance with configuration
 * 
 * Factory function that creates and configures AI service
 * with environment-based settings and error handling.
 * 
 * @returns Configured AI service instance
 */
export function createAIService(): AIService {
  const apiKey = process.env['GEMINI_API_KEY'];

  if (!apiKey) {
    throw new ExternalServiceError(
      'GEMINI_API_KEY environment variable is required',
      500,
      { configuration_error: 'missing_api_key' }
    );
  }

  const config: AIServiceConfig = {
    apiKey,
    model: 'gemini-2.0-flash',
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000 // 1 second base delay
  };

  return new AIService(config);
}

/**
 * Singleton AI service instance
 * 
 * Provides consistent AI service access across the application
 * while maintaining configuration and connection state.
 */
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = createAIService();
  }
  return aiServiceInstance;
}