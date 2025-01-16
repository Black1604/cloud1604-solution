import client from 'prom-client';
import { logger } from './logger';

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (e.g., CPU, memory usage)
client.collectDefaultMetrics({ register });

// Create custom metrics
const emailCounter = new client.Counter({
  name: 'email_total',
  help: 'Total number of emails sent',
  labelNames: ['status'],
});

const emailDurationHistogram = new client.Histogram({
  name: 'email_duration_seconds',
  help: 'Time taken to send emails',
  buckets: [0.1, 0.5, 1, 2, 5],
});

const emailQueueGauge = new client.Gauge({
  name: 'email_queue_size',
  help: 'Current size of email queue',
});

// Register custom metrics
register.registerMetric(emailCounter);
register.registerMetric(emailDurationHistogram);
register.registerMetric(emailQueueGauge);

export class Metrics {
  private static instance: Metrics;

  private constructor() {
    logger.info('Metrics initialized');
  }

  public static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  // Increment counter with status label
  public increment(metric: string, value: number = 1, labels: Record<string, string> = {}): void {
    try {
      switch (metric) {
        case 'email.sent':
          emailCounter.inc({ status: 'success' }, value);
          break;
        case 'email.failed':
          emailCounter.inc({ status: 'failed' }, value);
          break;
        default:
          logger.warn(`Unknown metric: ${metric}`);
      }
    } catch (error) {
      logger.error('Error incrementing metric', {
        metric,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Record timing
  public timing(metric: string, duration: number): void {
    try {
      switch (metric) {
        case 'email.delivery_time':
          emailDurationHistogram.observe(duration / 1000); // Convert ms to seconds
          break;
        default:
          logger.warn(`Unknown timing metric: ${metric}`);
      }
    } catch (error) {
      logger.error('Error recording timing', {
        metric,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Set gauge value
  public setGauge(metric: string, value: number): void {
    try {
      switch (metric) {
        case 'email.queue_size':
          emailQueueGauge.set(value);
          break;
        default:
          logger.warn(`Unknown gauge metric: ${metric}`);
      }
    } catch (error) {
      logger.error('Error setting gauge', {
        metric,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get metrics for Prometheus
  public async getMetrics(): Promise<string> {
    try {
      return await register.metrics();
    } catch (error) {
      logger.error('Error getting metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return '';
    }
  }
}

// Export singleton instance
export const metrics = Metrics.getInstance(); 