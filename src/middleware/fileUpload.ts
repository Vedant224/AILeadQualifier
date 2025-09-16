/**
 * File Upload Middleware
 * 
 * Configures multer for handling CSV file uploads with proper
 * validation, size limits, and error handling.
 */

import multer from 'multer';
import { Request } from 'express';
import { LEAD_CONSTRAINTS } from '../models';
import { FileProcessingError } from '../utils/errors';

/**
 * Multer configuration for CSV file uploads
 * 
 * Configures memory storage for CSV files with appropriate
 * size limits and file type validation.
 */
const storage = multer.memoryStorage();

/**
 * File filter function for CSV uploads
 * 
 * Validates that uploaded files are CSV format and meet
 * basic requirements before processing.
 * 
 * @param req - Express request object
 * @param file - Uploaded file object
 * @param callback - Multer callback function
 */
function csvFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) {
  // Check file extension
  const isCSV = file.originalname.toLowerCase().endsWith('.csv');
  
  // Check MIME type (note: CSV MIME type can vary)
  const validMimeTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel'
  ];
  
  const haValidMimeType = validMimeTypes.includes(file.mimetype);
  
  if (isCSV || haValidMimeType) {
    callback(null, true);
  } else {
    const error = new FileProcessingError(
      'Invalid file type. Only CSV files are allowed.',
      {
        received_mimetype: file.mimetype,
        received_filename: file.originalname,
        allowed_extensions: ['.csv'],
        allowed_mimetypes: validMimeTypes
      }
    );
    
    callback(error);
  }
}

/**
 * Multer upload configuration
 * 
 * Configures multer with memory storage, file filtering,
 * and size limits for CSV file uploads.
 */
export const uploadCSV = multer({
  storage: storage,
  fileFilter: csvFileFilter,
  limits: {
    // Maximum file size in bytes
    fileSize: LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES,
    
    // Maximum number of files (single file upload)
    files: 1,
    
    // Maximum number of fields in multipart form
    fields: 10,
    
    // Maximum field name size
    fieldNameSize: 100,
    
    // Maximum field value size
    fieldSize: 1024 * 1024 // 1MB
  }
});

/**
 * Error handling middleware for multer errors
 * 
 * Catches and formats multer-specific errors into
 * consistent API error responses.
 * 
 * @param error - Multer error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function handleMulterError(
  error: any,
  _req: Request,
  res: any,
  next: any
) {
  if (error instanceof multer.MulterError) {
    let message: string;
    let details: any = {
      error_type: 'multer_error',
      multer_code: error.code
    };
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES} bytes`;
        details.max_size_bytes = LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES;
        break;
        
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file is allowed';
        details.max_files = 1;
        break;
        
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field. Use "file" as the field name';
        details.expected_field = 'file';
        break;
        
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many form fields';
        break;
        
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
        
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
        
      default:
        message = `File upload error: ${error.message}`;
    }
    
    const fileError = new FileProcessingError(message, details);
    
    return res.status(400).json({
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: fileError.message,
        details: fileError.details,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Pass non-multer errors to the next error handler
  next(error);
}

/**
 * Middleware to ensure file is present in request
 * 
 * Validates that a file was uploaded before proceeding
 * to the controller logic.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requireFile(req: Request, res: any, next: any) {
  if (!req.file) {
    const error = new FileProcessingError(
      'No file uploaded. Please provide a CSV file.',
      {
        expected_field: 'file',
        content_type: req.get('Content-Type')
      }
    );
    
    return res.status(400).json({
      error: {
        code: 'NO_FILE_UPLOADED',
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
}