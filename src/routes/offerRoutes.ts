/**
 * Offer Routes
 * 
 * Defines HTTP routes for offer management endpoints.
 * Handles routing and middleware setup for offer-related operations.
 */

import { Router } from 'express';
import { createOffer, getOffer } from '../controllers/offerController';
import { requestLogger } from '../middleware/requestLogger';
import { validateContentType } from '../middleware/validation';

/**
 * Express router for offer endpoints
 */
const router = Router();

/**
 * POST /offer - Create or update offer information
 * 
 * Accepts JSON payload with product/offer details:
 * - name: Product/service name
 * - value_props: Array of value propositions
 * - ideal_use_cases: Array of ideal use cases
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 * - Content-type validation to ensure JSON payload
 */
router.post(
  '/',
  requestLogger('POST /offer'),
  validateContentType('application/json'),
  createOffer
);

/**
 * GET /offer - Retrieve current offer information
 * 
 * Returns the currently stored offer data if available.
 * Useful for debugging and verifying stored information.
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 */
router.get(
  '/',
  requestLogger('GET /offer'),
  getOffer
);

export default router;