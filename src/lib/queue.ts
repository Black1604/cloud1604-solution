import Queue from 'bull';
import { SendEmailOptions } from './email';
import { logger } from './logger';
import { metrics } from './metrics';

// Email queue configuration
const emailQueue = new Queue<SendEmailOptions>('email', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  limiter: {
    max: 100, // Max jobs per time window
    duration: 60000, // Time window in ms (1 minute)
  },
});

// Process email jobs
emailQueue.process(async (job) => {
  const startTime = Date.now();
  try {
    const { data } = job;
    
    // Log email attempt
    logger.info('Processing email job', {
      id: job.id,
      to: data.to,
      subject: data.subject,
    });

    // Send email
    const result = await sendEmail(data);

    // Track metrics
    metrics.increment('email.sent', result ? 1 : 0);
    metrics.timing('email.delivery_time', Date.now() - startTime);

    return result;
  } catch (error) {
    // Log error
    logger.error('Email job failed', {
      id: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Track failure
    metrics.increment('email.failed', 1);

    throw error;
  }
});

// Handle completed jobs
emailQueue.on('completed', (job) => {
  logger.info('Email job completed', {
    id: job.id,
    to: job.data.to,
  });
});

// Handle failed jobs
emailQueue.on('failed', (job, error) => {
  logger.error('Email job failed', {
    id: job?.id,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
});

// Add email to queue
export async function queueEmail(options: SendEmailOptions): Promise<string> {
  const job = await emailQueue.add(options, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });

  return job.id;
} 