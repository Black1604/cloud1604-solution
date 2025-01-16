import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.production');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('Production environment file not found!');
  process.exit(1);
}

// Define environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['production']),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  APP_NAME: z.string().default('Business Solution System'),
  DEBUG: z.enum(['true', 'false']).default('false'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().refine(
    (url) => url.startsWith('postgresql://'),
    { message: 'DATABASE_URL must be a valid PostgreSQL connection string' }
  ),
  DB_MAX_CONNECTIONS: z.string().transform(Number).pipe(z.number().min(1).max(1000))
    .default('100'),
  DB_SSL_ENABLED: z.enum(['true', 'false']).default('true'),
  DB_POOL_SIZE: z.string().transform(Number).pipe(z.number().min(5).max(20))
    .default('10'),
  DB_TIMEOUT: z.string().transform(Number).pipe(z.number().min(5000))
    .default('30000'),
  DB_IDLE_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000))
    .default('10000'),

  // Web Server (Gunicorn/Nginx)
  GUNICORN_WORKERS: z.string().transform(Number).pipe(z.number().min(2))
    .default('4'),
  GUNICORN_TIMEOUT: z.string().transform(Number).pipe(z.number().min(30))
    .default('120'),
  NGINX_MAX_BODY_SIZE: z.string().default('10m'),
  NGINX_PROXY_TIMEOUT: z.string().transform(Number).pipe(z.number().min(60))
    .default('120'),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  REDIS_PASSWORD: z.string().min(8),
  REDIS_MAX_MEMORY: z.string().default('256mb'),
  REDIS_CACHE_TTL: z.string().transform(Number).pipe(z.number().min(60))
    .default('3600'),

  // Email Configuration
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  EMAIL_FROM: z.string().email(),
  EMAIL_TEMPLATE_PATH: z.string().default('/templates/email'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()),
  MAX_CONCURRENT_USERS: z.string().transform(Number).pipe(z.number().positive())
    .default('1000'),

  // Monitoring
  ENABLE_METRICS: z.enum(['true', 'false']),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  PROMETHEUS_ENABLED: z.enum(['true', 'false']).default('true'),
  GRAFANA_ENABLED: z.enum(['true', 'false']).default('true'),
  MONITOR_QUERY_PERFORMANCE: z.enum(['true', 'false']).default('true'),
  SLOW_QUERY_THRESHOLD: z.string().transform(Number).pipe(z.number().min(100))
    .default('1000'),

  // Security
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10)).default('12'),
  ENABLE_SSL: z.enum(['true', 'false']).default('true'),
  XSS_PROTECTION: z.enum(['true', 'false']).default('true'),
  CSRF_PROTECTION: z.enum(['true', 'false']).default('true'),
  SECURE_HEADERS: z.enum(['true', 'false']).default('true'),

  // Feature Flags
  ENABLE_EMAIL_NOTIFICATIONS: z.enum(['true', 'false']),
  ENABLE_AUDIT_LOGS: z.enum(['true', 'false']),
  ENABLE_RATE_LIMITING: z.enum(['true', 'false']),
  ENABLE_LOAD_BALANCING: z.enum(['true', 'false']).default('true'),
  ENABLE_QUERY_CACHING: z.enum(['true', 'false']).default('true'),
  ENABLE_FILE_UPLOAD: z.enum(['true', 'false']).default('true'),

  // Backup Configuration
  BACKUP_ENABLED: z.enum(['true', 'false']),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().positive()),
  BACKUP_PATH: z.string(),
  BACKUP_COMPRESSION_ENABLED: z.enum(['true', 'false']).default('true'),
  BACKUP_NOTIFICATION_EMAIL: z.string().email().optional(),
  BACKUP_FREQUENCY: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  BACKUP_TIME: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('02:00'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_PATH: z.string(),
  ENABLE_ERROR_TRACKING: z.enum(['true', 'false']).default('true'),
  LOG_ROTATION_SIZE: z.string().default('100m'),
  LOG_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().min(7))
    .default('30'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),

  // File Upload
  UPLOAD_MAX_SIZE: z.string().default('10mb'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx,xls,xlsx,csv'),
  UPLOAD_PATH: z.string(),
  
  // Report Generation
  REPORT_TEMPLATE_PATH: z.string(),
  REPORT_OUTPUT_PATH: z.string(),
  ENABLE_REPORT_CACHING: z.enum(['true', 'false']).default('true'),
  REPORT_CACHE_TTL: z.string().transform(Number).pipe(z.number().min(300))
    .default('3600'),
});

// Validate environment variables
try {
  const env = envSchema.parse(process.env);
  console.log('✅ Environment validation passed');
  
  // Additional checks
  const checks = [
    {
      name: 'Database URL format',
      check: () => {
        const url = new URL(env.DATABASE_URL);
        return url.protocol === 'postgresql:';
      },
    },
    {
      name: 'PostgreSQL SSL configuration',
      check: () => {
        return env.DB_SSL_ENABLED === 'true' ? 
          env.DATABASE_URL.includes('sslmode=verify-full') : true;
      },
    },
    {
      name: 'SMTP port security',
      check: () => {
        return [25, 465, 587, 2525].includes(env.SMTP_PORT);
      },
    },
    {
      name: 'Backup path exists',
      check: () => {
        return fs.existsSync(env.BACKUP_PATH);
      },
    },
    {
      name: 'Log path exists',
      check: () => {
        return fs.existsSync(env.LOG_PATH);
      },
    },
    {
      name: 'Upload path exists',
      check: () => {
        return fs.existsSync(env.UPLOAD_PATH);
      },
    },
    {
      name: 'Report paths exist',
      check: () => {
        return fs.existsSync(env.REPORT_TEMPLATE_PATH) && 
               fs.existsSync(env.REPORT_OUTPUT_PATH);
      },
    },
    {
      name: 'Production URL uses HTTPS',
      check: () => {
        return env.NEXTAUTH_URL.startsWith('https://');
      },
    },
    {
      name: 'Redis memory configuration',
      check: () => {
        return env.REDIS_MAX_MEMORY.endsWith('mb') || 
               env.REDIS_MAX_MEMORY.endsWith('gb');
      },
    },
    {
      name: 'Backup schedule configuration',
      check: () => {
        const [hour, minute] = env.BACKUP_TIME.split(':').map(Number);
        return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
      },
    },
  ];

  console.log('\nRunning additional checks:');
  for (const { name, check } of checks) {
    try {
      if (check()) {
        console.log(`✅ ${name}: Passed`);
      } else {
        console.log(`❌ ${name}: Failed`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${name}: Error - ${errorMessage}`);
    }
  }

  // Security recommendations
  console.log('\nSecurity recommendations:');
  const recommendations = [
    {
      check: () => env.NODE_ENV === 'production',
      message: 'Ensure NODE_ENV is set to production',
    },
    {
      check: () => env.NEXTAUTH_URL.startsWith('https://'),
      message: 'Use HTTPS for NEXTAUTH_URL',
    },
    {
      check: () => env.REDIS_PASSWORD.length >= 12,
      message: 'Use a strong Redis password (12+ characters)',
    },
    {
      check: () => env.DATABASE_URL.includes('sslmode=verify-full'),
      message: 'Enable SSL verification for PostgreSQL connection',
    },
    {
      check: () => env.ENABLE_RATE_LIMITING === 'true',
      message: 'Enable rate limiting in production',
    },
    {
      check: () => env.BCRYPT_ROUNDS >= 12,
      message: 'Use sufficient bcrypt rounds (12+)',
    },
    {
      check: () => env.ENABLE_LOAD_BALANCING === 'true',
      message: 'Enable load balancing for high availability',
    },
    {
      check: () => env.ENABLE_ERROR_TRACKING === 'true',
      message: 'Enable error tracking for monitoring',
    },
    {
      check: () => env.BACKUP_COMPRESSION_ENABLED === 'true',
      message: 'Enable backup compression to save space',
    },
    {
      check: () => env.XSS_PROTECTION === 'true',
      message: 'Enable XSS protection',
    },
    {
      check: () => env.CSRF_PROTECTION === 'true',
      message: 'Enable CSRF protection',
    },
    {
      check: () => env.SECURE_HEADERS === 'true',
      message: 'Enable secure headers',
    },
  ];

  for (const { check, message } of recommendations) {
    console.log(`${check() ? '✅' : '⚠️'} ${message}`);
  }

  // Performance recommendations
  console.log('\nPerformance recommendations:');
  const performanceChecks = [
    {
      check: () => Number(env.DB_MAX_CONNECTIONS) >= 100,
      message: 'Configure sufficient database connections',
    },
    {
      check: () => Number(env.MAX_CONCURRENT_USERS) >= 1000,
      message: 'Support required concurrent users (1000+)',
    },
    {
      check: () => env.ENABLE_LOAD_BALANCING === 'true',
      message: 'Enable load balancing for traffic spikes',
    },
    {
      check: () => env.ENABLE_QUERY_CACHING === 'true',
      message: 'Enable query caching for better performance',
    },
    {
      check: () => Number(env.DB_POOL_SIZE) >= 5,
      message: 'Configure sufficient database pool size',
    },
    {
      check: () => Number(env.GUNICORN_WORKERS) >= 2,
      message: 'Configure sufficient Gunicorn workers',
    },
  ];

  for (const { check, message } of performanceChecks) {
    console.log(`${check() ? '✅' : '⚠️'} ${message}`);
  }

} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`- ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
  }
  process.exit(1);
} 