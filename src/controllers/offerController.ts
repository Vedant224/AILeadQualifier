/**
 * Offer Controller
 * 
 * Handles HTTP requests related to product/offer management.
 * Provides endpoints for submitting and managing offer information
 * that will be used as context for lead scoring.
 */

import { Request, Response } from 'express';
import { validateOfferPayload } from '../utils/validation';
import { ValidationError, logError, formatErrorResponse } from '../utils/errors';
import { ApiResponse, HttpStatus } from '../models';
import dataStore from '../services/dataStore';

/**
 * Creates or updates offer information
 * 
 * POST /offer
 * 
 * Accepts JSON payload with product/offer details and stores it
 * for use in lead scoring context. Validates all input data
 * and provides detailed error feedback.
 * 
 * @param req - Express request object with offer payload
 * @param res - Express response object
 */
export async function createOffer(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Validate request payload
    const validationResult = validateOfferPayload(req.body);
    
    if (!validationResult.isValid) {
      // Return detailed validation errors
      const error = new ValidationError(
        'Offer validation failed',
        {
          validation_errors: validationResult.errors,
          received_payload: req.body
        }
      );
      
      logError(error, 'offer_validation');
      
      res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    // Store the validated offer data
    try {
      dataStore.setOffer(req.body);
    } catch (storeError) {
      logError(storeError, 'offer_storage');
      
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        formatErrorResponse(new Error('Failed to store offer data'))
      );
      return;
    }
    
    // Get storage statistics for response metadata
    const stats = dataStore.getStorageStats();
    const processingTime = Date.now() - startTime;
    
    // Return success response
    const response: ApiResponse = {
      data: {
        message: 'Offer created successfully',
        offer: {
          name: req.body.name,
          value_props_count: req.body.value_props.length,
          ideal_use_cases_count: req.body.ideal_use_cases.length
        },
        storage_stats: {
          has_offer: stats.hasOffer,
          last_updated: stats.lastUpdated
        }
      },
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime
      }
    };
    
    console.log(`✅ Offer created: "${req.body.name}" (${processingTime}ms)`);
    
    res.status(HttpStatus.CREATED).json(response);
    
  } catch (error) {
    // Handle unexpected errors
    logError(error, 'offer_creation');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}

/**
 * Retrieves current offer information
 * 
 * GET /offer
 * 
 * Returns the currently stored offer data if available.
 * Useful for debugging and verifying stored offer information.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getOffer(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const offer = dataStore.getOffer();
    
    if (!offer) {
      res.status(HttpStatus.NOT_FOUND).json(
        formatErrorResponse(
          new Error('No offer data found'),
          undefined
        )
      );
      return;
    }
    
    const processingTime = Date.now() - startTime;
    
    // Return offer data
    const response: ApiResponse = {
      data: {
        offer: {
          name: offer.name,
          value_props: offer.value_props,
          ideal_use_cases: offer.ideal_use_cases,
          created_at: offer.created_at
        }
      },
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime
      }
    };
    
    res.status(HttpStatus.OK).json(response);
    
  } catch (error) {
    logError(error, 'offer_retrieval');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}