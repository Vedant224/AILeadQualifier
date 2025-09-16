/**
 * Health Check Routes
 * 
 * Defines HTTP routes for health monitoring and system status endpoints.
 * Provides comprehensive health checks, liveness/readiness probes, and metrics.
 */

import { Router } from 'express';
import { healthCheck, livenessProbe, readinessProbe, systemMetrics } from '../controllers/healthController';
import { requestLogger } from '../middleware/requestLogger';

/**
 * Express router for health endpoints
 */
const router = Router();

/**
 * GET /health - Comprehensive health check
 * 
 * Performs detailed health checks on all system components including:
 * - AI service connectivity and response time
 * - Memory usage and system resources
 * - Data store status and functionality
 * - Overall system health assessment
 * 
 * Returns detailed status information suitable for monitoring dashboards.
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 */
router.get(
  '/',
  requestLogger('GET /health'),
  healthCheck
);

/**
 * GET /health/live - Liveness probe
 * 
 * Simple endpoint to check if the service is running and responsive.
 * Used by container orchestrators (Kubernetes, Docker Swarm) for
 * liveness probes to determine if the container should be restarted.
 * 
 * Returns minimal response with uptime information.
 * Should always return 200 OK if the process is running.
 */
router.get(
  '/live',
  livenessProbe
);

/**
 * GET /health/ready - Readiness probe
 * 
 * Checks if the service is ready to accept traffic by performing
 * quick checks on critical dependencies and system resources.
 * 
 * Used by load balancers and container orchestrators to determine
 * if traffic should be routed to this instance.
 * 
 * Returns 200 OK when ready, 503 Service Unavailable when not ready.
 */
router.get(
  '/ready',
  readinessProbe
);

/**
 * GET /health/metrics - System metrics
 * 
 * Returns detailed system metrics for monitoring and alerting including:
 * - Memory usage (RSS, heap usage, external memory)
 * - CPU usage statistics
 * - Storage/data store statistics
 * - Environment and configuration information
 * - Process information (uptime, PID, Node.js version)
 * 
 * Suitable for integration with monitoring systems like Prometheus,
 * DataDog, or custom monitoring solutions.
 * 
 * Middleware:
 * - Request logging for debugging and monitoring
 */
router.get(
  '/metrics',
  requestLogger('GET /health/metrics'),
  systemMetrics
);

export default router;