/**
 * Scoring Routes
 * 
 * Defines HTTP routes for lead scoring operations.
 * Handles scoring execution, results retrieval, and data export.
 */

import { Router } from 'express';
import { scoreLeads, getResults, exportResults, getScoringStatus } from '../controllers/scoringController';
import { requestLogger } from '../middleware/requestLogger';
import { rateLimit } from '../middleware/validation';

/**
 * Express router for scoring endpoints
 */
const router = Router();

/**
 * POST /score - Execute lead scoring
 * 
 * Triggers the complete lead scoring pipeline combining
 * rule-based evaluation with AI-powered intent analysis.
 * 
 * Prerequisites:
 * - Offer data must be submitted via POST /offer
 * - Lead data must be uploaded via POST /leads/upload
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 * - Rate limiting to prevent abuse (5 requests per 10 minutes)
 */
router.post(
  '/',
  requestLogger('POST /score'),
  rateLimit(5, 10 * 60 * 1000), // 5 requests per 10 minutes
  scoreLeads
);

/**
 * GET /score/status - Get scoring system status
 * 
 * Returns current system state, readiness for scoring,
 * and summary statistics about available data.
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 */
router.get(
  '/status',
  requestLogger('GET /score/status'),
  getScoringStatus
);

/**
 * GET /results - Retrieve scored results
 * 
 * Returns all scored lead results in JSON format with
 * support for filtering and pagination.
 * 
 * Query Parameters:
 * - intent: Filter by intent level (High/Medium/Low)
 * - min_score: Minimum score threshold (0-100)
 * - max_score: Maximum score threshold (0-100)
 * - limit: Maximum number of results to return
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 */
router.get(
  '/results',
  requestLogger('GET /results'),
  getResults
);

/**
 * GET /results/export - Export results as CSV
 * 
 * Returns scored results in CSV format suitable for
 * spreadsheet applications and further analysis.
 * 
 * Supports the same query parameters as GET /results
 * for consistent filtering across formats.
 * 
 * Response Headers:
 * - Content-Type: text/csv
 * - Content-Disposition: attachment with filename
 * - X-Total-Records: Number of records in export
 * - X-Processing-Time: Export processing time
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 * - Rate limiting to prevent abuse (10 requests per 5 minutes)
 */
router.get(
  '/results/export',
  requestLogger('GET /results/export'),
  rateLimit(10, 5 * 60 * 1000), // 10 requests per 5 minutes
  exportResults
);

export default router;