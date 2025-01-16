import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@/lib/redis';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as os from 'os';

interface DatabaseInfo {
  version: string;
  database: string;
  user: string;
}

interface ConnectionStats {
  active_connections: number;
  total_connections: number;
  max_connections: number;
}

interface DatabaseSize {
  size: string;
}

interface TableStats {
  schemaname: string;
  relname: string;
  row_count: number;
  total_size: string;
}

interface CacheStats {
  heap_read: number;
  heap_hit: number;
  cache_hit_ratio: number;
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      details?: any;
    };
  };
  metrics: {
    [key: string]: any;
  };
  featureFlags: {
    [key: string]: boolean;
  };
}

export async function GET(): Promise<NextResponse> {
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
    metrics: {},
    featureFlags: {}
  };

  try {
    // Database check with PostgreSQL-specific metrics
    try {
      // Basic connectivity check
      await db.$queryRaw`SELECT 1`;

      // Get PostgreSQL version and connection info
      const [dbInfo] = await db.$queryRaw<DatabaseInfo[]>`
        SELECT version(), 
               current_database() as database,
               current_user as user;
      `;

      // Get connection stats
      const [connectionStats] = await db.$queryRaw<ConnectionStats[]>`
        SELECT count(*) as active_connections,
               (SELECT count(*) FROM pg_stat_activity) as total_connections,
               (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') as max_connections;
      `;

      // Get database size
      const [dbSize] = await db.$queryRaw<DatabaseSize[]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size;
      `;

      // Get table statistics
      const tableStats = await db.$queryRaw<TableStats[]>`
        SELECT schemaname, relname, n_live_tup as row_count,
               pg_size_pretty(pg_total_relation_size(relid)) as total_size
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 5;
      `;

      // Get cache hit ratio
      const [cacheStats] = await db.$queryRaw<CacheStats[]>`
        SELECT 
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit)  as heap_hit,
          case when sum(heap_blks_hit) + sum(heap_blks_read) = 0 
            then 0 
            else (sum(heap_blks_hit) * 100 / (sum(heap_blks_hit) + sum(heap_blks_read)))::numeric 
          end as cache_hit_ratio
        FROM pg_statio_user_tables;
      `;

      healthCheck.checks.database = {
        status: 'healthy',
        details: {
          info: dbInfo,
          connections: connectionStats,
          size: dbSize,
          topTables: tableStats,
          cacheHitRatio: cacheStats
        }
      };
    } catch (error) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      healthCheck.status = 'unhealthy';
    }

    // Redis check
    try {
      const redis = await getRedisClient();
      await redis.ping();
      const info = await redis.info();
      healthCheck.checks.redis = { 
        status: 'healthy',
        details: {
          version: info.split('\n').find(line => line.startsWith('redis_version'))?.split(':')[1],
          memory_used: info.split('\n').find(line => line.startsWith('used_memory_human'))?.split(':')[1],
          connected_clients: info.split('\n').find(line => line.startsWith('connected_clients'))?.split(':')[1]
        }
      };
    } catch (error) {
      healthCheck.checks.redis = {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      healthCheck.status = 'unhealthy';
    }

    // Auth check
    try {
      await getServerSession(authOptions);
      healthCheck.checks.auth = { status: 'healthy' };
    } catch (error) {
      healthCheck.checks.auth = {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      healthCheck.status = 'unhealthy';
    }

    // File system checks
    const paths = [
      env.UPLOAD_PATH,
      env.REPORT_TEMPLATE_PATH,
      env.REPORT_OUTPUT_PATH,
      env.EMAIL_TEMPLATE_PATH,
      env.LOG_PATH,
      env.BACKUP_PATH
    ];

    healthCheck.checks.filesystem = { status: 'healthy' };
    for (const path of paths) {
      try {
        fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK);
      } catch (error) {
        healthCheck.checks.filesystem = {
          status: 'unhealthy',
          details: `Cannot access ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        healthCheck.status = 'unhealthy';
        break;
      }
    }

    // System metrics
    healthCheck.metrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };

    // Environment configuration
    healthCheck.metrics.configuration = {
      environment: env.NODE_ENV,
      dbMaxConnections: env.DB_MAX_CONNECTIONS,
      dbPoolSize: env.DB_POOL_SIZE,
      gunicornWorkers: env.GUNICORN_WORKERS,
      redisMaxMemory: env.REDIS_MAX_MEMORY,
      maxConcurrentUsers: env.MAX_CONCURRENT_USERS,
      uploadMaxSize: env.UPLOAD_MAX_SIZE,
      allowedFileTypes: env.ALLOWED_FILE_TYPES,
      logLevel: env.LOG_LEVEL,
      logFormat: env.LOG_FORMAT,
      backupFrequency: env.BACKUP_FREQUENCY,
      backupRetentionDays: env.BACKUP_RETENTION_DAYS
    };

    // Feature flags
    healthCheck.featureFlags = {
      metrics: env.ENABLE_METRICS === 'true',
      prometheus: env.PROMETHEUS_ENABLED === 'true',
      grafana: env.GRAFANA_ENABLED === 'true',
      emailNotifications: env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
      auditLogs: env.ENABLE_AUDIT_LOGS === 'true',
      rateLimiting: env.ENABLE_RATE_LIMITING === 'true',
      loadBalancing: env.ENABLE_LOAD_BALANCING === 'true',
      queryCaching: env.ENABLE_QUERY_CACHING === 'true',
      fileUpload: env.ENABLE_FILE_UPLOAD === 'true',
      backup: env.BACKUP_ENABLED === 'true',
      errorTracking: env.ENABLE_ERROR_TRACKING === 'true',
      reportCaching: env.ENABLE_REPORT_CACHING === 'true'
    };

    return NextResponse.json(healthCheck);
  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.checks.unknown = {
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    return NextResponse.json(healthCheck, { status: 500 });
  }
} 