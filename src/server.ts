/**
 * Lead Scoring Backend API Server
 * 
 * Main server entry point that initializes the Express application
 * with middleware, routes, and error handling for the lead scoring service.
 * 
 * This server provides endpoints for:
 * - Product/offer management
 * - Lead data upload and processing
 * - AI-powered lead scoring
 * - Results retrieval and export
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import offerRoutes from './routes/offerRoutes';
import leadRoutes from './routes/leadRoutes';
import scoringRoutes from './routes/scoringRoutes';
import healthRoutes from './routes/healthRoutes';

// Import middleware
import { handleJsonParsingError } from './middleware/validation';
import { errorLogger } from './middleware/requestLogger';
import { globalErrorHandler, notFoundHandler, timeoutHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

/**
 * Express application instance
 */
const app = express();

/**
 * Server configuration from environment variables
 */
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Security middleware configuration
 * - helmet: Sets various HTTP headers for security
 * - cors: Enables Cross-Origin Resource Sharing
 */
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

/**
 * Request parsing middleware
 * - express.json(): Parses JSON request bodies
 * - express.urlencoded(): Parses URL-encoded request bodies
 * - handleJsonParsingError: Custom JSON parsing error handler
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(handleJsonParsingError);

/**
 * Logging middleware
 * Uses different log formats based on environment
 */
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * Basic health check endpoint
 * Returns server status and basic system information
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

/**
 * Request timeout middleware
 */
app.use(timeoutHandler(30000)); // 30 second timeout

/**
 * API Routes
 */
app.use('/health', healthRoutes);
app.use('/offer', offerRoutes);
app.use('/leads', leadRoutes);
app.use('/score', scoringRoutes);
app.use('/results', scoringRoutes); // Mount results endpoints

/**
 * Root endpoint with API information
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Lead Scoring Backend API',
    version: '1.0.0',
    description: 'Backend service for lead qualification using rule-based scoring and AI-powered intent analysis',
    endpoints: {
      health: 'GET /health',
      liveness: 'GET /health/live',
      readiness: 'GET /health/ready',
      metrics: 'GET /health/metrics',
      offer: 'POST /offer',
      upload: 'POST /leads/upload',
      score: 'POST /score',
      status: 'GET /score/status',
      results: 'GET /results',
      export: 'GET /results/export'
    }
  });
});

/**
 * 404 handler for undefined routes
 */
app.use('*', notFoundHandler);

/**
 * Error logging middleware
 */
app.use(errorLogger);

/**
 * Global error handling middleware
 */
app.use(globalErrorHandler);

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`🚀 Lead Scoring API server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  if (NODE_ENV === 'development') {
    console.log(`📖 API docs: http://localhost:${PORT}/`);
  }
});

export default app;