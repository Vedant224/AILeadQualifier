/**
 * Validation Utilities Unit Tests
 * 
 * Comprehensive test suite for validation functions including
 * offer validation, lead validation, and CSV processing validation.
 */

import {
  validateOfferPayload,
  validateLeadData,
  validateCSVHeaders,
  validateFileUpload
} from '../utils/validation';
import { OFFER_CONSTRAINTS, LEAD_CONSTRAINTS } from '../models';

describe('Validation Utilities', () => {
  describe('validateOfferPayload', () => {
    const validOffer = {
      name: 'AI Outreach Automation',
      value_props: ['24/7 outreach', '6x more meetings'],
      ideal_use_cases: ['B2B SaaS mid-market', 'Technology companies']
    };
    
    it('should validate a correct offer payload', () => {
      const result = validateOfferPayload(validOffer);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.context).toBe('offer_validation');
    });
    
    it('should reject null or undefined payload', () => {
      const result1 = validateOfferPayload(null);
      const result2 = validateOfferPayload(undefined);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result1.errors[0].message).toContain('valid JSON object');
    });
    
    it('should reject missing name field', () => {
      const invalidOffer = { ...validOffer };
      delete (invalidOffer as any).name;
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });
    
    it('should reject empty name', () => {
      const invalidOffer = { ...validOffer, name: '' };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });
    
    it('should reject name that is too long', () => {
      const longName = 'a'.repeat(OFFER_CONSTRAINTS.NAME.MAX_LENGTH + 1);
      const invalidOffer = { ...validOffer, name: longName };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.message.includes('exceed'))).toBe(true);
    });
    
    it('should reject non-string name', () => {
      const invalidOffer = { ...validOffer, name: 123 };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.message.includes('string'))).toBe(true);
    });
    
    it('should reject missing value_props', () => {
      const invalidOffer = { ...validOffer };
      delete (invalidOffer as any).value_props;
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'value_props')).toBe(true);
    });
    
    it('should reject non-array value_props', () => {
      const invalidOffer = { ...validOffer, value_props: 'not an array' };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'value_props' && e.message.includes('array'))).toBe(true);
    });
    
    it('should reject empty value_props array', () => {
      const invalidOffer = { ...validOffer, value_props: [] };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'value_props')).toBe(true);
    });
    
    it('should reject too many value_props', () => {
      const tooManyProps = Array(OFFER_CONSTRAINTS.VALUE_PROPS.MAX_ITEMS + 1).fill('prop');
      const invalidOffer = { ...validOffer, value_props: tooManyProps };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'value_props' && e.message.includes('Maximum'))).toBe(true);
    });
    
    it('should reject non-string items in value_props', () => {
      const invalidOffer = { ...validOffer, value_props: ['valid prop', 123, 'another valid'] };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'value_props[1]')).toBe(true);
    });
    
    it('should reject value_props items that are too long', () => {
      const longProp = 'a'.repeat(OFFER_CONSTRAINTS.VALUE_PROPS.ITEM_MAX_LENGTH + 1);
      const invalidOffer = { ...validOffer, value_props: ['valid', longProp] };
      
      const result = validateOfferPayload(invalidOffer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'value_props[1]' && e.message.includes('exceed'))).toBe(true);
    });
    
    it('should validate ideal_use_cases with same rules as value_props', () => {
      // Test missing ideal_use_cases
      const invalidOffer1 = { ...validOffer };
      delete (invalidOffer1 as any).ideal_use_cases;
      
      const result1 = validateOfferPayload(invalidOffer1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors.some(e => e.field === 'ideal_use_cases')).toBe(true);
      
      // Test non-array ideal_use_cases
      const invalidOffer2 = { ...validOffer, ideal_use_cases: 'not array' };
      const result2 = validateOfferPayload(invalidOffer2);
      expect(result2.isValid).toBe(false);
      
      // Test too many ideal_use_cases
      const tooMany = Array(OFFER_CONSTRAINTS.IDEAL_USE_CASES.MAX_ITEMS + 1).fill('use case');
      const invalidOffer3 = { ...validOffer, ideal_use_cases: tooMany };
      const result3 = validateOfferPayload(invalidOffer3);
      expect(result3.isValid).toBe(false);
    });
  });
  
  describe('validateLeadData', () => {
    const validLead = {
      name: 'John Doe',
      role: 'CEO',
      company: 'Tech Corp',
      industry: 'Technology',
      location: 'San Francisco, CA',
      linkedin_bio: 'Experienced technology executive with 15 years in SaaS.'
    };
    
    it('should validate a correct lead', () => {
      const result = validateLeadData(validLead, 1);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.context).toBe('lead_validation');
    });
    
    it('should reject null or undefined lead data', () => {
      const result1 = validateLeadData(null, 1);
      const result2 = validateLeadData(undefined, 1);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result1.errors[0].row).toBe(1);
    });
    
    it('should validate all required fields', () => {
      LEAD_CONSTRAINTS.REQUIRED_COLUMNS.forEach(field => {
        const invalidLead = { ...validLead };
        delete (invalidLead as any)[field];
        
        const result = validateLeadData(invalidLead, 2);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === field && e.row === 2)).toBe(true);
      });
    });
    
    it('should reject non-string field values', () => {
      const invalidLead = { ...validLead, name: 123 };
      
      const result = validateLeadData(invalidLead, 3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.message.includes('string'))).toBe(true);
    });
    
    it('should reject empty string fields', () => {
      const invalidLead = { ...validLead, role: '' };
      
      const result = validateLeadData(invalidLead, 4);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'role')).toBe(true);
    });
    
    it('should reject fields that are too long', () => {
      const longName = 'a'.repeat(LEAD_CONSTRAINTS.FIELD_LENGTHS.NAME.MAX + 1);
      const invalidLead = { ...validLead, name: longName };
      
      const result = validateLeadData(invalidLead, 5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.message.includes('exceed'))).toBe(true);
    });
    
    it('should validate linkedin_bio length constraints', () => {
      const longBio = 'a'.repeat(LEAD_CONSTRAINTS.FIELD_LENGTHS.LINKEDIN_BIO.MAX + 1);
      const invalidLead = { ...validLead, linkedin_bio: longBio };
      
      const result = validateLeadData(invalidLead, 6);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'linkedin_bio')).toBe(true);
    });
    
    it('should include row number in error messages', () => {
      const invalidLead = { ...validLead, name: '' };
      const rowNumber = 42;
      
      const result = validateLeadData(invalidLead, rowNumber);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].row).toBe(rowNumber);
    });
  });
  
  describe('validateCSVHeaders', () => {
    const validHeaders = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
    
    it('should validate correct headers', () => {
      const result = validateCSVHeaders(validHeaders);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.context).toBe('csv_validation');
    });
    
    it('should handle case-insensitive headers', () => {
      const mixedCaseHeaders = ['Name', 'ROLE', 'company', 'Industry', 'LOCATION', 'linkedin_bio'];
      
      const result = validateCSVHeaders(mixedCaseHeaders);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should handle headers with extra whitespace', () => {
      const spacedHeaders = [' name ', '  role', 'company  ', 'industry', 'location', 'linkedin_bio'];
      
      const result = validateCSVHeaders(spacedHeaders);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should reject null or undefined headers', () => {
      const result1 = validateCSVHeaders(null as any);
      const result2 = validateCSVHeaders(undefined as any);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
    
    it('should reject non-array headers', () => {
      const result = validateCSVHeaders('not an array' as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('valid headers');
    });
    
    it('should reject missing required headers', () => {
      const incompleteHeaders = ['name', 'role', 'company']; // Missing industry, location, linkedin_bio
      
      const result = validateCSVHeaders(incompleteHeaders);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('industry'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('location'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('linkedin_bio'))).toBe(true);
    });
    
    it('should allow extra headers (with warning)', () => {
      const extraHeaders = [...validHeaders, 'extra_field', 'another_extra'];
      
      // Mock console.warn to capture warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = validateCSVHeaders(extraHeaders);
      
      expect(result.isValid).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('extra columns')
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('validateFileUpload', () => {
    const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'test.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: 1000,
      destination: '',
      filename: '',
      path: '',
      buffer: Buffer.from('test'),
      stream: null as any,
      ...overrides
    });
    
    it('should validate a correct file', () => {
      const validFile = createMockFile();
      
      const result = validateFileUpload(validFile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.context).toBe('file_validation');
    });
    
    it('should reject missing file', () => {
      const result = validateFileUpload(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('No file uploaded');
    });
    
    it('should reject files that are too large', () => {
      const largeFile = createMockFile({
        size: LEAD_CONSTRAINTS.FILE.MAX_SIZE_BYTES + 1
      });
      
      const result = validateFileUpload(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('size exceeds'))).toBe(true);
    });
    
    it('should reject non-CSV files by mimetype', () => {
      const nonCSVFile = createMockFile({
        mimetype: 'application/pdf',
        originalname: 'document.pdf'
      });
      
      const result = validateFileUpload(nonCSVFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('CSV file'))).toBe(true);
    });
    
    it('should reject non-CSV files by extension', () => {
      const nonCSVFile = createMockFile({
        mimetype: 'text/plain',
        originalname: 'document.txt'
      });
      
      const result = validateFileUpload(nonCSVFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('CSV file'))).toBe(true);
    });
    
    it('should accept CSV files with various mimetypes', () => {
      const validMimetypes = ['text/csv', 'application/csv', 'text/plain'];
      
      validMimetypes.forEach(mimetype => {
        const csvFile = createMockFile({
          mimetype,
          originalname: 'data.csv'
        });
        
        const result = validateFileUpload(csvFile);
        expect(result.isValid).toBe(true);
      });
    });
    
    it('should accept files with .csv extension regardless of mimetype', () => {
      const csvFile = createMockFile({
        mimetype: 'application/octet-stream', // Generic mimetype
        originalname: 'leads.csv'
      });
      
      const result = validateFileUpload(csvFile);
      
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle validation with special characters', () => {
      const specialOffer = {
        name: 'AI Tool™ with émojis 🚀',
        value_props: ['Feature with "quotes"', 'Feature with, commas'],
        ideal_use_cases: ['Use case with\nnewlines', 'Use case with\ttabs']
      };
      
      const result = validateOfferPayload(specialOffer);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should handle validation with unicode characters', () => {
      const unicodeLead = {
        name: 'José María González',
        role: 'Développeur Senior',
        company: 'Société Française',
        industry: 'Technologie',
        location: 'Paris, France 🇫🇷',
        linkedin_bio: 'Expérience en développement logiciel avec expertise en IA'
      };
      
      const result = validateLeadData(unicodeLead, 1);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should handle extremely long field values gracefully', () => {
      const extremelyLongBio = 'a'.repeat(10000); // Much longer than allowed
      const invalidLead = {
        name: 'Test User',
        role: 'CEO',
        company: 'Test Corp',
        industry: 'Technology',
        location: 'Test City',
        linkedin_bio: extremelyLongBio
      };
      
      const result = validateLeadData(invalidLead, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'linkedin_bio')).toBe(true);
    });
  });
});