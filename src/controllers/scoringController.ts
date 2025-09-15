/**
 * Scoring Controller
 * 
 * Handles HTTP requests related to lead scoring operations.
 * Provides endpoints for triggering scoring, retrieving results,
 * and exporting data in various formats.
 */

import { Request, Response } from 'express';
import { BusinessLogicError, logError, formatErrorResponse } from '../utils/errors';
import { ApiResponse, HttpStatus, ScoringResponse, ErrorCode } from '../models';
import { createScoringService } from '../services/scoringService';
import { generateCSVFromResults } from '../utils/csvExport';
import dataStore from '../services/dataStore';

/**
 * Triggers lead scoring process
 * 
 * POST /score
 * 
 * Executes the complete scoring pipeline on all uploaded leads
 * using the current offer context. Combines rule-based scoring
 * with AI-powered intent analysis.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function scoreLeads(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting lead scoring process...');
    
    // Validate prerequisites
    const offer = dataStore.getOffer();
    if (!offer) {
      const error = new BusinessLogicError(
        'No offer data available. Please submit offer information first.',
        ErrorCode.NO_OFFER_DATA,
        {
          required_endpoint: 'POST /offer',
          current_state: 'missing_offer'
        }
      );
      
      logError(error, 'scoring_validation');
      
      res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    const leads = dataStore.getLeads();
    if (leads.length === 0) {
      const error = new BusinessLogicError(
        'No lead data available. Please upload leads first.',
        ErrorCode.NO_LEADS_DATA,
        {
          required_endpoint: 'POST /leads/upload',
          current_state: 'missing_leads'
        }
      );
      
      logError(error, 'scoring_validation');
      
      res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    // Check if scoring is already in progress (simple in-memory check)
    if (dataStore.hasScoredResults()) {
      console.log('⚠️ Previous scoring results exist, will overwrite');
    }
    
    console.log(`📊 Scoring ${leads.length} leads against offer: "${offer.name}"`);
    
    // Create scoring service and execute scoring
    const scoringService = createScoringService({
      useAI: true,
      continueOnAIFailure: true,
      batchSize: 5
    });
    
    const scoredLeads = await scoringService.scoreLeads(leads, offer);
    const stats = scoringService.getStats();
    
    // Store results
    dataStore.setScoredResults(scoredLeads);
    
    const processingTime = Date.now() - startTime;
    
    // Calculate score distribution
    const distribution = {
      High: scoredLeads.filter(lead => lead.intent === 'High').length,
      Medium: scoredLeads.filter(lead => lead.intent === 'Medium').length,
      Low: scoredLeads.filter(lead => lead.intent === 'Low').length
    };
    
    // Calculate average score
    const avgScore = scoredLeads.reduce((sum, lead) => sum + lead.score, 0) / scoredLeads.length;
    
    // Prepare response
    const scoringResponse: ScoringResponse = {
      leads_scored: stats.successfulScores,
      leads_failed: stats.failedScores,
      summary: {
        average_score: Math.round(avgScore * 100) / 100,
        intent_distribution: distribution,
        processing_time_ms: processingTime,
        completed_at: new Date().toISOString()
      },
      errors: stats.failedScores > 0 ? [{
        lead_name: 'Multiple leads',
        error_type: 'data_processing',
        message: `${stats.failedScores} leads failed scoring`,
        fallback_applied: true
      }] : undefined
    };
    
    const response: ApiResponse<ScoringResponse> = {
      data: scoringResponse,
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime,
        ai_success_rate: stats.aiSuccesses / (stats.aiSuccesses + stats.aiFailures),
        total: scoredLeads.length
      }
    };
    
    console.log(`✅ Scoring complete: ${scoredLeads.length} leads processed in ${processingTime}ms`);
    console.log(`📈 Distribution: High=${distribution.High}, Medium=${distribution.Medium}, Low=${distribution.Low}`);
    
    res.status(HttpStatus.OK).json(response);
    
  } catch (error) {
    logError(error, 'lead_scoring');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}

/**
 * Retrieves scored results
 * 
 * GET /results
 * 
 * Returns all scored lead results in JSON format with
 * comprehensive scoring details and metadata.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getResults(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const scoredResults = dataStore.getScoredResults();
    
    if (scoredResults.length === 0) {
      res.status(HttpStatus.OK).json({
        data: [],
        timestamp: new Date().toISOString(),
        meta: {
          total: 0,
          message: 'No scored results available. Run scoring first.',
          processing_time_ms: Date.now() - startTime
        }
      });
      return;
    }
    
    // Add query parameter support for filtering
    const { intent, min_score, max_score, limit } = req.query;
    
    let filteredResults = [...scoredResults];
    
    // Filter by intent level
    if (intent && typeof intent === 'string') {
      const validIntents = ['High', 'Medium', 'Low'];
      if (validIntents.includes(intent)) {
        filteredResults = filteredResults.filter(lead => lead.intent === intent);
      }
    }
    
    // Filter by score range
    if (min_score && typeof min_score === 'string') {
      const minScore = parseInt(min_score);
      if (!isNaN(minScore)) {
        filteredResults = filteredResults.filter(lead => lead.score >= minScore);
      }
    }
    
    if (max_score && typeof max_score === 'string') {
      const maxScore = parseInt(max_score);
      if (!isNaN(maxScore)) {
        filteredResults = filteredResults.filter(lead => lead.score <= maxScore);
      }
    }
    
    // Apply limit
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredResults = filteredResults.slice(0, limitNum);
      }
    }
    
    // Sort by score (highest first)
    filteredResults.sort((a, b) => b.score - a.score);
    
    const processingTime = Date.now() - startTime;
    
    // Calculate summary statistics
    const avgScore = filteredResults.reduce((sum, lead) => sum + lead.score, 0) / filteredResults.length;
    const distribution = {
      High: filteredResults.filter(lead => lead.intent === 'High').length,
      Medium: filteredResults.filter(lead => lead.intent === 'Medium').length,
      Low: filteredResults.filter(lead => lead.intent === 'Low').length
    };
    
    const response: ApiResponse = {
      data: filteredResults.map(lead => ({
        name: lead.name,
        role: lead.role,
        company: lead.company,
        industry: lead.industry,
        location: lead.location,
        intent: lead.intent,
        score: lead.score,
        reasoning: lead.reasoning,
        rule_breakdown: lead.rule_breakdown,
        ai_analysis: {
          intent: lead.ai_analysis.intent,
          reasoning: lead.ai_analysis.reasoning,
          score: lead.ai_analysis.score,
          confidence: lead.ai_analysis.confidence
        },
        scored_at: lead.scored_at
      })),
      timestamp: new Date().toISOString(),
      meta: {
        total: filteredResults.length,
        total_available: scoredResults.length,
        processing_time_ms: processingTime,
        summary: {
          average_score: Math.round(avgScore * 100) / 100,
          intent_distribution: distribution,
          filters_applied: {
            intent: intent || null,
            min_score: min_score || null,
            max_score: max_score || null,
            limit: limit || null
          }
        }
      }
    };
    
    console.log(`📊 Results retrieved: ${filteredResults.length}/${scoredResults.length} leads (${processingTime}ms)`);
    
    res.status(HttpStatus.OK).json(response);
    
  } catch (error) {
    logError(error, 'results_retrieval');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}

/**
 * Exports results as CSV
 * 
 * GET /results/export
 * 
 * Returns scored results in CSV format for spreadsheet applications
 * with all scoring details and metadata included.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function exportResults(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const scoredResults = dataStore.getScoredResults();
    
    if (scoredResults.length === 0) {
      // Return empty CSV with headers
      const emptyCSV = 'name,role,company,industry,location,intent,score,reasoning,rule_score,ai_score,confidence,scored_at\n';
      
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="lead_scores_empty.csv"',
        'Cache-Control': 'no-cache'
      });
      
      res.status(HttpStatus.OK).send(emptyCSV);
      return;
    }
    
    // Apply same filtering as getResults
    const { intent, min_score, max_score, limit } = req.query;
    
    let filteredResults = [...scoredResults];
    
    // Apply filters (same logic as getResults)
    if (intent && typeof intent === 'string') {
      const validIntents = ['High', 'Medium', 'Low'];
      if (validIntents.includes(intent)) {
        filteredResults = filteredResults.filter(lead => lead.intent === intent);
      }
    }
    
    if (min_score && typeof min_score === 'string') {
      const minScore = parseInt(min_score);
      if (!isNaN(minScore)) {
        filteredResults = filteredResults.filter(lead => lead.score >= minScore);
      }
    }
    
    if (max_score && typeof max_score === 'string') {
      const maxScore = parseInt(max_score);
      if (!isNaN(maxScore)) {
        filteredResults = filteredResults.filter(lead => lead.score <= maxScore);
      }
    }
    
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredResults = filteredResults.slice(0, limitNum);
      }
    }
    
    // Sort by score (highest first)
    filteredResults.sort((a, b) => b.score - a.score);
    
    // Generate CSV
    const csvContent = generateCSVFromResults(filteredResults);
    const processingTime = Date.now() - startTime;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `lead_scores_${timestamp}.csv`;
    
    // Set response headers
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
      'X-Total-Records': filteredResults.length.toString(),
      'X-Processing-Time': processingTime.toString()
    });
    
    console.log(`📁 CSV export complete: ${filteredResults.length} leads exported in ${processingTime}ms`);
    
    res.status(HttpStatus.OK).send(csvContent);
    
  } catch (error) {
    logError(error, 'csv_export');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}

/**
 * Gets scoring status and statistics
 * 
 * GET /score/status
 * 
 * Returns current scoring status, statistics, and system state
 * for monitoring and debugging purposes.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getScoringStatus(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const offer = dataStore.getOffer();
    const leads = dataStore.getLeads();
    const scoredResults = dataStore.getScoredResults();
    const stats = dataStore.getStorageStats();
    
    const processingTime = Date.now() - startTime;
    
    const status = {
      system_ready: offer !== null && leads.length > 0,
      offer_available: offer !== null,
      leads_available: leads.length > 0,
      results_available: scoredResults.length > 0,
      data_summary: {
        offer_name: offer?.name || null,
        total_leads: leads.length,
        scored_leads: scoredResults.length,
        last_updated: stats.lastUpdated
      },
      scoring_readiness: {
        can_score: offer !== null && leads.length > 0,
        missing_requirements: [
          ...(offer === null ? ['offer_data'] : []),
          ...(leads.length === 0 ? ['lead_data'] : [])
        ]
      }
    };
    
    if (scoredResults.length > 0) {
      const distribution = {
        High: scoredResults.filter(lead => lead.intent === 'High').length,
        Medium: scoredResults.filter(lead => lead.intent === 'Medium').length,
        Low: scoredResults.filter(lead => lead.intent === 'Low').length
      };
      
      const avgScore = scoredResults.reduce((sum, lead) => sum + lead.score, 0) / scoredResults.length;
      
      (status as any).results_summary = {
        average_score: Math.round(avgScore * 100) / 100,
        intent_distribution: distribution,
        score_range: {
          min: Math.min(...scoredResults.map(lead => lead.score)),
          max: Math.max(...scoredResults.map(lead => lead.score))
        }
      };
    }
    
    const response: ApiResponse = {
      data: status,
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime
      }
    };
    
    res.status(HttpStatus.OK).json(response);
    
  } catch (error) {
    logError(error, 'scoring_status');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}