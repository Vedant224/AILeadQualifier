/**
 * API Integration Tests
 * 
 * End-to-end integration tests for the complete Lead Scoring API workflow.
 * Tests the full pipeline from offer submission through lead scoring to results export.
 */

import request from 'supertest';
import app from '../../server';
import { createWriteStream } from 'fs';
import { join } from 'path';

describe('Lead Scoring API Integration Tests', () => {
  // Test data
  const testOffer = {
    name: 'AI Sales Assistant',
    value_props: [
      'Automated lead qualification',
      '24/7 availability',
      'Personalized outreach'
    ],
    ideal_use_cases: [
      'B2B SaaS companies',
      'Technology startups',
      'Sales teams 10-50 people'
    ]
  };

  const testCSVContent = `name,role,company,industry,location,linkedin_bio
John Doe,CEO,TechCorp,Technology,San Francisco CA,Technology executive with 15 years experience in SaaS platforms
Sarah Johnson,VP Marketing,DataCorp,Software,New York NY,Marketing leader focused on B2B growth and customer acquisition
Mike Wilson,Software Engineer,StartupInc,Technology,Austin TX,Full-stack developer passionate about AI and automation
Lisa Chen,Director of Sales,SalesForce,Technology,Seattle WA,Sales director with expertise in enterprise software solutions
Bob Smith,Marketing Manager,RetailCorp,Retail,Chicago IL,Marketing professional with focus on customer acquisition`;

  beforeEach(async () => {
    // Clear any existing data before each test
    // Note: In a real application, you might want to reset the database here
  });

  describe('Health and Status Endpoints', () => {
    it('should return API information at root endpoint', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Lead Scoring Backend API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('offer');
    });

    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('checks');
      expect(response.body.data.checks).toHaveProperty('ai_service');
      expect(response.body.data.checks).toHaveProperty('memory');
      expect(response.body.data.checks).toHaveProperty('data_store');
    });

    it('should return liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return readiness probe', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('storage');
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should execute complete lead scoring workflow', async () => {
      // Step 1: Submit offer information
      const offerResponse = await request(app)
        .post('/offer')
        .send(testOffer)
        .expect(201);

      expect(offerResponse.body.data.message).toContain('successfully');
      expect(offerResponse.body.data.offer.name).toBe(testOffer.name);

      // Step 2: Upload lead data
      const uploadResponse = await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(testCSVContent), 'test-leads.csv')
        .expect(201);

      expect(uploadResponse.body.data.leads_processed).toBe(5);
      expect(uploadResponse.body.data.leads_rejected).toBe(0);

      // Step 3: Check scoring status (should be ready)
      const statusResponse = await request(app)
        .get('/score/status')
        .expect(200);

      expect(statusResponse.body.data.system_ready).toBe(true);
      expect(statusResponse.body.data.offer_available).toBe(true);
      expect(statusResponse.body.data.leads_available).toBe(true);

      // Step 4: Execute scoring
      const scoringResponse = await request(app)
        .post('/score')
        .expect(200);

      expect(scoringResponse.body.data.leads_scored).toBe(5);
      expect(scoringResponse.body.data.summary).toHaveProperty('average_score');
      expect(scoringResponse.body.data.summary).toHaveProperty('intent_distribution');

      // Step 5: Retrieve results
      const resultsResponse = await request(app)
        .get('/results')
        .expect(200);

      expect(resultsResponse.body.data).toHaveLength(5);
      expect(resultsResponse.body.data[0]).toHaveProperty('name');
      expect(resultsResponse.body.data[0]).toHaveProperty('intent');
      expect(resultsResponse.body.data[0]).toHaveProperty('score');
      expect(resultsResponse.body.data[0]).toHaveProperty('reasoning');

      // Step 6: Export results as CSV
      const exportResponse = await request(app)
        .get('/results/export')
        .expect(200);

      expect(exportResponse.headers['content-type']).toContain('text/csv');
      expect(exportResponse.headers['content-disposition']).toContain('attachment');
      expect(exportResponse.text).toContain('name,role,company,industry');
      expect(exportResponse.text).toContain('John Doe,CEO,TechCorp');
    }, 60000); // 60 second timeout for complete workflow
  });

  describe('Offer Management', () => {
    it('should create and retrieve offer', async () => {
      // Create offer
      const createResponse = await request(app)
        .post('/offer')
        .send(testOffer)
        .expect(201);

      expect(createResponse.body.data.offer.name).toBe(testOffer.name);

      // Retrieve offer
      const getResponse = await request(app)
        .get('/offer')
        .expect(200);

      expect(getResponse.body.data.offer.name).toBe(testOffer.name);
      expect(getResponse.body.data.offer.value_props).toEqual(testOffer.value_props);
    });

    it('should validate offer data', async () => {
      const invalidOffer = {
        name: '', // Invalid: empty name
        value_props: [], // Invalid: empty array
        ideal_use_cases: ['Valid use case']
      };

      const response = await request(app)
        .post('/offer')
        .send(invalidOffer)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.validation_errors).toBeDefined();
    });

    it('should handle missing offer data', async () => {
      const response = await request(app)
        .get('/offer')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Lead Management', () => {
    it('should upload and process CSV file', async () => {
      const response = await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(testCSVContent), 'leads.csv')
        .expect(201);

      expect(response.body.data.leads_processed).toBe(5);
      expect(response.body.data.summary.total_rows).toBe(5);
      expect(response.body.data.summary.file_size_bytes).toBeGreaterThan(0);
    });

    it('should validate CSV format', async () => {
      const invalidCSV = 'invalid,csv,format\nwithout,proper,headers';

      const response = await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(invalidCSV), 'invalid.csv')
        .expect(400);

      expect(response.body.error.code).toBe('CSV_PARSING_ERROR');
    });

    it('should reject non-CSV files', async () => {
      const textContent = 'This is not a CSV file';

      const response = await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(textContent), 'document.txt')
        .expect(400);

      expect(response.body.error.code).toBe('FILE_UPLOAD_ERROR');
    });

    it('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/leads/upload')
        .expect(400);

      expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
    });

    it('should get lead summary', async () => {
      // First upload leads
      await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(testCSVContent), 'leads.csv')
        .expect(201);

      // Then get summary
      const response = await request(app)
        .get('/leads')
        .expect(200);

      expect(response.body.data.lead_count).toBe(5);
      expect(response.body.data.has_leads).toBe(true);
    });
  });

  describe('Lead Scoring', () => {
    beforeEach(async () => {
      // Set up offer and leads for scoring tests
      await request(app)
        .post('/offer')
        .send(testOffer);

      await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(testCSVContent), 'leads.csv');
    });

    it('should execute lead scoring', async () => {
      const response = await request(app)
        .post('/score')
        .expect(200);

      expect(response.body.data.leads_scored).toBe(5);
      expect(response.body.data.summary.average_score).toBeGreaterThan(0);
      expect(response.body.data.summary.intent_distribution).toHaveProperty('High');
      expect(response.body.data.summary.intent_distribution).toHaveProperty('Medium');
      expect(response.body.data.summary.intent_distribution).toHaveProperty('Low');
    }, 30000);

    it('should prevent scoring without offer', async () => {
      // Clear offer data by creating a new instance (in real app, would reset DB)
      const response = await request(app)
        .post('/score')
        .expect(422);

      expect(response.body.error.code).toBe('NO_OFFER_DATA');
    });

    it('should get scoring status', async () => {
      const response = await request(app)
        .get('/score/status')
        .expect(200);

      expect(response.body.data).toHaveProperty('system_ready');
      expect(response.body.data).toHaveProperty('offer_available');
      expect(response.body.data).toHaveProperty('leads_available');
    });
  });

  describe('Results and Export', () => {
    beforeEach(async () => {
      // Set up complete workflow for results testing
      await request(app)
        .post('/offer')
        .send(testOffer);

      await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(testCSVContent), 'leads.csv');

      await request(app)
        .post('/score');
    }, 30000);

    it('should retrieve all results', async () => {
      const response = await request(app)
        .get('/results')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('intent');
      expect(response.body.data[0]).toHaveProperty('score');
      expect(response.body.data[0]).toHaveProperty('rule_breakdown');
      expect(response.body.data[0]).toHaveProperty('ai_analysis');
    });

    it('should filter results by intent', async () => {
      const response = await request(app)
        .get('/results?intent=High')
        .expect(200);

      expect(response.body.data.every((lead: any) => lead.intent === 'High')).toBe(true);
    });

    it('should filter results by score range', async () => {
      const response = await request(app)
        .get('/results?min_score=50')
        .expect(200);

      expect(response.body.data.every((lead: any) => lead.score >= 50)).toBe(true);
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/results?limit=3')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
    });

    it('should export results as CSV', async () => {
      const response = await request(app)
        .get('/results/export')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('name,role,company');
      expect(response.text).toContain('John Doe');
    });

    it('should export filtered results as CSV', async () => {
      const response = await request(app)
        .get('/results/export?intent=High&min_score=60')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['x-total-records']).toBeDefined();
    });

    it('should handle empty results gracefully', async () => {
      // Test with filters that return no results
      const response = await request(app)
        .get('/results?min_score=999')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.details.available_endpoints).toBeDefined();
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/offer')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/offer')
        .send(testOffer)
        .expect(400);

      expect(response.body.error.message).toContain('Content-Type');
    });

    it('should include request timing in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.meta).toHaveProperty('processing_time_ms');
      expect(typeof response.body.meta.processing_time_ms).toBe('number');
    });
  });

  describe('Performance and Load', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health/live')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
      });
    });

    it('should process large CSV files efficiently', async () => {
      // Create a larger CSV for performance testing
      const largeCSVRows = Array(100).fill(null).map((_, index) => 
        `Lead ${index},Manager,Company ${index},Technology,Location ${index},Bio for lead ${index}`
      );
      const largeCSV = `name,role,company,industry,location,linkedin_bio\n${largeCSVRows.join('\n')}`;

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/leads/upload')
        .attach('file', Buffer.from(largeCSV), 'large-leads.csv')
        .expect(201);

      const processingTime = Date.now() - startTime;

      expect(response.body.data.leads_processed).toBe(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});