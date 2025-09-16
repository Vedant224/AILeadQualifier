/**
 * Lead Controller
 * 
 * Handles HTTP requests related to lead data management.
 * Provides endpoints for uploading CSV files and processing
 * lead data for scoring operations.
 */

import { Request, Response } from 'express';
import { validateLeadData, validateCSVHeaders, validateFileUpload } from '../utils/validation';
import { ValidationError, FileProcessingError, logError, formatErrorResponse } from '../utils/errors';
import { ApiResponse, HttpStatus, UploadResponse, ValidationError as IValidationError } from '../models';
import { parseCSVFile } from '../utils/csvParser';
import dataStore from '../services/dataStore';

/**
 * Uploads and processes CSV file with lead data
 * 
 * POST /leads/upload
 * 
 * Accepts CSV file with required columns: name, role, company, industry, location, linkedin_bio
 * Validates file format, parses data, and stores valid leads for scoring.
 * 
 * @param req - Express request object with uploaded file
 * @param res - Express response object
 */
export async function uploadLeads(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Validate file upload
    const file = req.file;
    const fileValidation = validateFileUpload(file as Express.Multer.File);
    
    if (!fileValidation.isValid) {
      const error = new FileProcessingError(
        'File upload validation failed',
        {
          validation_errors: fileValidation.errors,
          file_info: file ? {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          } : null
        }
      );
      
      logError(error, 'file_upload_validation');
      
      res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    console.log(`📁 Processing CSV file: ${file!.originalname} (${file!.size} bytes)`);
    
    // Parse CSV file
    let csvData: any[];
    let headers: string[];
    
    try {
      const parseResult = await parseCSVFile(file!.buffer);
      csvData = parseResult.data;
      headers = parseResult.headers;
      
      console.log(`📊 CSV parsed: ${csvData.length} rows, ${headers.length} columns`);
    } catch (parseError) {
      const error = new FileProcessingError(
        'Failed to parse CSV file',
        {
          error_type: 'csv_parsing',
          original_error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          file_info: {
            originalname: file!.originalname,
            size: file!.size
          }
        }
      );
      
      logError(error, 'csv_parsing');
      
      res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    // Validate CSV headers
    const headerValidation = validateCSVHeaders(headers);
    if (!headerValidation.isValid) {
      const error = new FileProcessingError(
        'Invalid CSV headers',
        {
          validation_errors: headerValidation.errors,
          received_headers: headers,
          expected_headers: ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio']
        }
      );
      
      logError(error, 'csv_header_validation');
      
      res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    // Process and validate each lead
    const validLeads: any[] = [];
    const validationErrors: IValidationError[] = [];
    let processedRows = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const rowNumber = i + 2; // +2 because CSV rows start at 2 (after header)
      const leadData = csvData[i];
      
      processedRows++;
      
      // Skip empty rows
      if (!leadData || Object.values(leadData).every(val => !val || String(val).trim() === '')) {
        console.log(`⚠️ Skipping empty row ${rowNumber}`);
        continue;
      }
      
      // Validate lead data
      const leadValidation = validateLeadData(leadData, rowNumber);
      
      if (leadValidation.isValid) {
        // Clean and normalize lead data
        const cleanedLead = {
          name: String(leadData.name).trim(),
          role: String(leadData.role).trim(),
          company: String(leadData.company).trim(),
          industry: String(leadData.industry).trim(),
          location: String(leadData.location).trim(),
          linkedin_bio: String(leadData.linkedin_bio).trim()
        };
        
        validLeads.push(cleanedLead);
      } else {
        // Collect validation errors
        validationErrors.push(...leadValidation.errors);
      }
    }
    
    console.log(`✅ Validation complete: ${validLeads.length} valid, ${validationErrors.length} errors`);
    
    // Check if we have any valid leads to store
    if (validLeads.length === 0) {
      const error = new ValidationError(
        'No valid leads found in CSV file',
        {
          total_rows: processedRows,
          validation_errors: validationErrors,
          file_info: {
            originalname: file!.originalname,
            size: file!.size
          }
        }
      );
      
      logError(error, 'no_valid_leads');
      
      res.status(HttpStatus.BAD_REQUEST).json(
        formatErrorResponse(error)
      );
      return;
    }
    
    // Store valid leads
    try {
      dataStore.setLeads(validLeads);
    } catch (storeError) {
      logError(storeError, 'lead_storage');
      
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        formatErrorResponse(new Error('Failed to store lead data'))
      );
      return;
    }
    
    const processingTime = Date.now() - startTime;
    
    // Prepare upload response
    const uploadResponse: UploadResponse = {
      leads_processed: validLeads.length,
      leads_rejected: validationErrors.length,
      validation_errors: validationErrors,
      summary: {
        total_rows: processedRows,
        file_size_bytes: file!.size,
        processing_time_ms: processingTime
      }
    };
    
    // Return success response
    const response: ApiResponse<UploadResponse> = {
      data: uploadResponse,
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime
      }
    };
    
    console.log(`🎉 Upload complete: ${validLeads.length} leads stored (${processingTime}ms)`);
    
    res.status(HttpStatus.CREATED).json(response);
    
  } catch (error) {
    // Handle unexpected errors
    logError(error, 'lead_upload');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}

/**
 * Retrieves current lead data summary
 * 
 * GET /leads
 * 
 * Returns summary information about currently stored leads
 * without exposing sensitive lead data.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function getLeadsSummary(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    const leads = dataStore.getLeads();
    const stats = dataStore.getStorageStats();
    
    const processingTime = Date.now() - startTime;
    
    // Return summary data (no sensitive information)
    const response: ApiResponse = {
      data: {
        lead_count: leads.length,
        has_leads: stats.leadCount > 0,
        last_updated: stats.lastUpdated,
        sample_fields: leads.length > 0 ? {
          industries: [...new Set(leads.slice(0, 10).map(l => l.industry))],
          roles: [...new Set(leads.slice(0, 10).map(l => l.role))],
          companies: [...new Set(leads.slice(0, 10).map(l => l.company))]
        } : null
      },
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime
      }
    };
    
    res.status(HttpStatus.OK).json(response);
    
  } catch (error) {
    logError(error, 'leads_summary');
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatErrorResponse(error)
    );
  }
}