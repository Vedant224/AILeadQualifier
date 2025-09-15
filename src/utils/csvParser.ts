/**
 * CSV Parsing Utilities
 * 
 * Provides utilities for parsing CSV files with proper error handling
 * and data validation for lead information processing.
 */

import csv from 'csv-parser';
import { Readable } from 'stream';
import { LEAD_CONSTRAINTS } from '../models';

/**
 * CSV parsing result interface
 * 
 * Contains parsed data and metadata from CSV processing
 */
export interface CSVParseResult {
  /** Array of parsed row objects */
  data: any[];
  
  /** Array of column headers */
  headers: string[];
  
  /** Total number of rows processed */
  totalRows: number;
  
  /** Processing metadata */
  metadata: {
    /** File size in bytes */
    fileSizeBytes: number;
    
    /** Processing time in milliseconds */
    processingTimeMs: number;
    
    /** Whether any rows were skipped */
    hasSkippedRows: boolean;
  };
}

/**
 * Parses CSV buffer into structured data
 * 
 * Processes CSV file buffer and returns parsed data with validation.
 * Handles various CSV formats and provides detailed error information.
 * 
 * @param buffer - CSV file buffer to parse
 * @returns Promise resolving to parsed CSV data and metadata
 */
export async function parseCSVFile(buffer: Buffer): Promise<CSVParseResult> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const data: any[] = [];
    let headers: string[] = [];
    let totalRows = 0;
    let hasSkippedRows = false;
    
    // Create readable stream from buffer
    const stream = Readable.from(buffer);
    
    // Configure CSV parser
    const parser = csv({
      // Skip empty lines
      skipEmptyLines: true,
      
      // Trim whitespace from headers and values
      mapHeaders: ({ header }) => {
        const trimmedHeader = header.trim().toLowerCase();
        return trimmedHeader;
      },
      
      // Transform values to handle various data formats
      mapValues: ({ value }) => {
        if (typeof value === 'string') {
          // Trim whitespace and handle quoted values
          let trimmed = value.trim();
          
          // Remove surrounding quotes if present
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            trimmed = trimmed.slice(1, -1);
          }
          
          return trimmed;
        }
        return value;
      }
    });
    
    // Handle parser events
    parser.on('headers', (headerList: string[]) => {
      headers = headerList;
      console.log(`📋 CSV headers detected: ${headers.join(', ')}`);
      
      // Validate header count
      if (headers.length < LEAD_CONSTRAINTS.REQUIRED_COLUMNS.length) {
        reject(new Error(`Insufficient columns. Expected ${LEAD_CONSTRAINTS.REQUIRED_COLUMNS.length}, got ${headers.length}`));
        return;
      }
    });
    
    parser.on('data', (row: any) => {
      totalRows++;
      
      // Check for completely empty rows
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && String(value).trim() !== ''
      );
      
      if (!hasData) {
        hasSkippedRows = true;
        console.log(`⚠️ Skipping empty row ${totalRows}`);
        return;
      }
      
      // Check row size limits
      if (data.length >= LEAD_CONSTRAINTS.FILE.MAX_LEADS_PER_UPLOAD) {
        console.warn(`⚠️ Maximum lead limit reached (${LEAD_CONSTRAINTS.FILE.MAX_LEADS_PER_UPLOAD}). Stopping parsing.`);
        parser.destroy();
        return;
      }
      
      data.push(row);
    });
    
    parser.on('end', () => {
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ CSV parsing complete: ${data.length} rows processed in ${processingTime}ms`);
      
      resolve({
        data,
        headers,
        totalRows,
        metadata: {
          fileSizeBytes: buffer.length,
          processingTimeMs: processingTime,
          hasSkippedRows
        }
      });
    });
    
    parser.on('error', (error: Error) => {
      console.error('❌ CSV parsing error:', error.message);
      reject(new Error(`CSV parsing failed: ${error.message}`));
    });
    
    // Handle stream errors
    stream.on('error', (error: Error) => {
      console.error('❌ Stream error:', error.message);
      reject(new Error(`File stream error: ${error.message}`));
    });
    
    // Start parsing
    try {
      stream.pipe(parser);
    } catch (error) {
      reject(new Error(`Failed to start CSV parsing: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Validates CSV data structure
 * 
 * Performs additional validation on parsed CSV data to ensure
 * it meets the requirements for lead processing.
 * 
 * @param parseResult - Result from CSV parsing
 * @returns Validation result with any issues found
 */
export function validateCSVStructure(parseResult: CSVParseResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if we have data
  if (parseResult.data.length === 0) {
    errors.push('CSV file contains no data rows');
  }
  
  // Check if we have headers
  if (parseResult.headers.length === 0) {
    errors.push('CSV file contains no headers');
  }
  
  // Check for required columns
  const requiredColumns = LEAD_CONSTRAINTS.REQUIRED_COLUMNS;
  const missingColumns = requiredColumns.filter(col => 
    !parseResult.headers.includes(col.toLowerCase())
  );
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  // Check for extra columns (warning only)
  const extraColumns = parseResult.headers.filter(header => 
    !requiredColumns.map(col => col.toLowerCase()).includes(header)
  );
  
  if (extraColumns.length > 0) {
    warnings.push(`Extra columns will be ignored: ${extraColumns.join(', ')}`);
  }
  
  // Check data consistency
  if (parseResult.data.length > 0) {
    const firstRow = parseResult.data[0];
    const expectedFields = parseResult.headers.length;
    const actualFields = Object.keys(firstRow).length;
    
    if (actualFields !== expectedFields) {
      warnings.push(`Inconsistent field count: expected ${expectedFields}, got ${actualFields}`);
    }
  }
  
  // Check file size warnings
  if (parseResult.metadata.fileSizeBytes > LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES * 0.8) {
    warnings.push('File size is approaching the maximum limit');
  }
  
  // Check lead count warnings
  if (parseResult.data.length > LEAD_CONSTRAINTS.FILE.MAX_LEADS_PER_UPLOAD * 0.8) {
    warnings.push('Lead count is approaching the maximum limit');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}