import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('Business Solution System'),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  DEBUG: z.enum(['true', 'false']).default('false'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string().refine(
    (url) => url.startsWith('postgresql://'),
    { message: 'DATABASE_URL must be a valid PostgreSQL connection string' }
  ),
  DB_MAX_CONNECTIONS: z.string().transform(Number).default('100'),
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
  REDIS_PORT: z.string().transform(Number),
  REDIS_PASSWORD: z.string(),
  REDIS_MAX_MEMORY: z.string().default('256mb'),
  REDIS_CACHE_TTL: z.string().transform(Number).pipe(z.number().min(60))
    .default('3600'),

  // Email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  EMAIL_FROM: z.string().email(),
  EMAIL_TEMPLATE_PATH: z.string().default('/templates/email'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('15'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  MAX_CONCURRENT_USERS: z.string().transform(Number).default('1000'),

  // Monitoring
  ENABLE_METRICS: z.enum(['true', 'false']).default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),
  PROMETHEUS_ENABLED: z.enum(['true', 'false']).default('true'),
  GRAFANA_ENABLED: z.enum(['true', 'false']).default('true'),
  MONITOR_QUERY_PERFORMANCE: z.enum(['true', 'false']).default('true'),
  SLOW_QUERY_THRESHOLD: z.string().transform(Number).pipe(z.number().min(100))
    .default('1000'),

  // Security
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  ENABLE_SSL: z.enum(['true', 'false']).default('true'),
  XSS_PROTECTION: z.enum(['true', 'false']).default('true'),
  CSRF_PROTECTION: z.enum(['true', 'false']).default('true'),
  SECURE_HEADERS: z.enum(['true', 'false']).default('true'),

  // Feature Flags
  ENABLE_EMAIL_NOTIFICATIONS: z.enum(['true', 'false']).default('true'),
  ENABLE_AUDIT_LOGS: z.enum(['true', 'false']).default('true'),
  ENABLE_RATE_LIMITING: z.enum(['true', 'false']).default('true'),
  ENABLE_LOAD_BALANCING: z.enum(['true', 'false']).default('true'),
  ENABLE_QUERY_CACHING: z.enum(['true', 'false']).default('true'),
  ENABLE_FILE_UPLOAD: z.enum(['true', 'false']).default('true'),

  // Backup
  BACKUP_ENABLED: z.enum(['true', 'false']).default('true'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default('30'),
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

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;

// Export type
export type Env = z.infer<typeof envSchema>; 