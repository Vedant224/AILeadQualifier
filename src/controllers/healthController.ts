/**
 * Health Check Controller
 * 
 * Provides comprehensive health monitoring endpoints for system
 * status, dependency checks, and operational metrics.
 */

import { Request, Response } from 'express';
import { HealthResponse, ServiceCheck, ApiResponse, HttpStatus } from '../models';
import { getAIService } from '../services/aiService';
import { logError } from '../utils/errors';
import dataStore from '../services/dataStore';

/**
 * Comprehensive health check endpoint
 * 
 * GET /health
 * 
 * Performs detailed health checks on all system components
 * including AI service connectivity, memory usage, and data store status.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    console.log('🔍 Performing comprehensive health check...');

    // Perform all health checks in parallel
    const [aiCheck, memoryCheck, dataStoreCheck] = await Promise.allSettled([
      checkAIService(),
      checkMemoryUsage(),
      checkDataStore()
    ]);

    // Process check results
    const checks = {
      ai_service: getCheckResult(aiCheck),
      memory: getCheckResult(memoryCheck),
      data_store: getCheckResult(dataStoreCheck)
    };

    // Determine overall system status
    const overallStatus = determineOverallStatus(checks);

    const processingTime = Date.now() - startTime;

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] || 'development',
      version: '1.0.0',
      checks
    };

    const response: ApiResponse<HealthResponse> = {
      data: healthResponse,
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime,
        uptime_seconds: Math.floor(process.uptime()),
        node_version: process.version
      }
    };

    // Set appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? HttpStatus.OK :
      overallStatus === 'degraded' ? HttpStatus.OK :
        HttpStatus.SERVICE_UNAVAILABLE;

    console.log(`✅ Health check complete: ${overallStatus} (${processingTime}ms)`);

    res.status(httpStatus).json(response);

  } catch (error) {
    logError(error, 'health_check');

    // Return unhealthy status on error
    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] || 'development',
      version: '1.0.0',
      checks: {
        ai_service: {
          status: 'unhealthy',
          details: 'Health check failed',
          last_checked: new Date().toISOString()
        },
        memory: {
          status: 'unhealthy',
          details: 'Health check failed',
          last_checked: new Date().toISOString()
        },
        data_store: {
          status: 'unhealthy',
          details: 'Health check failed',
          last_checked: new Date().toISOString()
        }
      }
    };

    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      data: errorResponse,
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: Date.now() - startTime,
        error: 'Health check system failure'
      }
    });
  }
}

/**
 * Simple liveness probe
 * 
 * GET /health/live
 * 
 * Basic endpoint to check if the service is running.
 * Used by container orchestrators for liveness probes.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function livenessProbe(_req: Request, res: Response): Promise<void> {
  res.status(HttpStatus.OK).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

/**
 * Readiness probe
 * 
 * GET /health/ready
 * 
 * Checks if the service is ready to accept traffic.
 * Performs quick checks on critical dependencies.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function readinessProbe(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    // Quick readiness checks
    const isReady = await Promise.race([
      checkServiceReadiness(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Readiness check timeout')), 5000)
      )
    ]);

    const processingTime = Date.now() - startTime;

    if (isReady) {
      res.status(HttpStatus.OK).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime
      });
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
        reason: 'Service dependencies not ready'
      });
    }

  } catch (error) {
    logError(error, 'readiness_probe');

    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      reason: 'Readiness check failed'
    });
  }
}

/**
 * System metrics endpoint
 * 
 * GET /health/metrics
 * 
 * Returns detailed system metrics for monitoring and alerting.
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function systemMetrics(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const storageStats = dataStore.getStorageStats();

    const metrics = {
      system: {
        uptime_seconds: Math.floor(process.uptime()),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      memory: {
        rss_bytes: memoryUsage.rss,
        heap_used_bytes: memoryUsage.heapUsed,
        heap_total_bytes: memoryUsage.heapTotal,
        external_bytes: memoryUsage.external,
        heap_usage_percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpu: {
        user_microseconds: cpuUsage.user,
        system_microseconds: cpuUsage.system
      },
      storage: {
        has_offer: storageStats.hasOffer,
        lead_count: storageStats.leadCount,
        scored_result_count: storageStats.scoredResultCount,
        estimated_memory_usage_bytes: storageStats.estimatedMemoryUsage,
        last_updated: storageStats.lastUpdated
      },
      environment: {
        node_env: process.env['NODE_ENV'] || 'development',
        has_ai_key: !!process.env['GEMINI_API_KEY'],
        port: process.env['PORT'] || 3000
      }
    };

    const processingTime = Date.now() - startTime;

    res.status(HttpStatus.OK).json({
      data: metrics,
      timestamp: new Date().toISOString(),
      meta: {
        processing_time_ms: processingTime
      }
    });

  } catch (error) {
    logError(error, 'system_metrics');

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to collect system metrics',
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Checks AI service connectivity and response time
 */
async function checkAIService(): Promise<ServiceCheck> {
  const startTime = Date.now();

  try {
    // Only check if API key is configured
    if (!process.env['GEMINI_API_KEY']) {
      return {
        status: 'degraded',
        details: 'AI service not configured (missing API key)',
        last_checked: new Date().toISOString()
      };
    }

    const aiService = getAIService();
    const connectivityResult = await aiService.testConnectivity();

    const responseTime = Date.now() - startTime;

    return {
      status: connectivityResult.connected ? 'healthy' : 'unhealthy',
      response_time_ms: responseTime,
      details: connectivityResult.connected
        ? 'AI service responding normally'
        : `AI service error: ${connectivityResult.error}`,
      last_checked: new Date().toISOString()
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      status: 'unhealthy',
      response_time_ms: responseTime,
      details: `AI service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

/**
 * Checks memory usage and system resources
 */
async function checkMemoryUsage(): Promise<ServiceCheck> {
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let details = `Heap usage: ${heapUsagePercentage.toFixed(1)}%`;

    if (heapUsagePercentage > 90) {
      status = 'unhealthy';
      details += ' (Critical: Very high memory usage)';
    } else if (heapUsagePercentage > 75) {
      status = 'degraded';
      details += ' (Warning: High memory usage)';
    }

    return {
      status,
      details,
      last_checked: new Date().toISOString()
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      details: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

/**
 * Checks data store status and connectivity
 */
async function checkDataStore(): Promise<ServiceCheck> {
  try {
    const stats = dataStore.getStorageStats();

    // Basic functionality test - data store is operational

    return {
      status: 'healthy',
      details: `Data store operational. Leads: ${stats.leadCount}, Results: ${stats.scoredResultCount}`,
      last_checked: new Date().toISOString()
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      details: `Data store check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

/**
 * Quick service readiness check
 */
async function checkServiceReadiness(): Promise<boolean> {
  try {
    // Check if essential services are available
    const memoryUsage = process.memoryUsage();
    const heapUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Service is ready if memory usage is reasonable
    return heapUsagePercentage < 95;

  } catch (error) {
    return false;
  }
}

/**
 * Extracts service check result from Promise.allSettled result
 */
function getCheckResult(result: PromiseSettledResult<ServiceCheck>): ServiceCheck {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    return {
      status: 'unhealthy',
      details: `Check failed: ${result.reason?.message || 'Unknown error'}`,
      last_checked: new Date().toISOString()
    };
  }
}

/**
 * Determines overall system status based on individual checks
 */
function determineOverallStatus(checks: Record<string, ServiceCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);

  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  } else if (statuses.includes('degraded')) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}