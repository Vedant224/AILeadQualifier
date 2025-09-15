/**
 * Lead Routes
 * 
 * Defines HTTP routes for lead management endpoints.
 * Handles CSV file uploads and lead data operations.
 */

import { Router } from 'express';
import { uploadLeads, getLeadsSummary } from '../controllers/leadController';
import { requestLogger } from '../middleware/requestLogger';
import { uploadCSV, handleMulterError, requireFile } from '../middleware/fileUpload';
import { rateLimit } from '../middleware/validation';

/**
 * Express router for lead endpoints
 */
const router = Router();

/**
 * POST /leads/upload - Upload CSV file with lead data
 * 
 * Accepts CSV file with required columns:
 * - name: Full name of the prospect
 * - role: Job title or role at their company
 * - company: Company name where the prospect works
 * - industry: Industry sector of the prospect's company
 * - location: Geographic location
 * - linkedin_bio: LinkedIn bio or professional summary
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 * - Rate limiting to prevent abuse (10 requests per 15 minutes)
 * - File upload handling with validation
 * - File presence validation
 * - Multer error handling
 */
router.post(
  '/upload',
  requestLogger('POST /leads/upload'),
  rateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  uploadCSV.single('file'),
  handleMulterError,
  requireFile,
  uploadLeads
);

/**
 * GET /leads - Get lead data summary
 * 
 * Returns summary information about currently stored leads
 * without exposing sensitive lead data. Useful for debugging
 * and verifying upload status.
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 */
router.get(
  '/',
  requestLogger('GET /leads'),
  getLeadsSummary
);

export default router;