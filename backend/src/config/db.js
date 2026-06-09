import { Sequelize } from 'sequelize';
import { infraLogger } from '../observability/logger.js';
import {
  createSequelizeLogger,
  monitorPoolHealth,
  instrumentConnectionAcquisition,
  checkDatabaseHealth
} from '../observability/instrumentation/sequelize.js';

const isProduction =
  process.env.NODE_ENV === 'production' &&
  !process.env.DATABASE_URL?.includes('localhost');

const shouldUseSSL = process.env.DB_SSL === 'true' || isProduction;
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD ?? '100', 10);

// Create logger placeholder (will be initialized after sequelize)
let sequelizeLogger = null;

/**
 * Create Sequelize instance with telemetry
 */
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',

  dialectOptions: shouldUseSSL
    ? {
        ssl: { require: true, rejectUnauthorized: false }
      }
    : {},

  // Enable query timing
  benchmark: true,

  // Structured logging with telemetry (use placeholder)
  logging: (sql, timing) => {
    if (!sequelizeLogger) {
      sequelizeLogger = createSequelizeLogger(sequelize, {
        slowQueryMs: SLOW_QUERY_MS,
        logAllQueries: !isProduction
      });
    }
    return sequelizeLogger(sql, timing);
  },

  // Connection pool
  pool: {
    max: parseInt(process.env.DB_POOL_MAX ?? (isProduction ? '25' : '5'), 10),
    min: parseInt(process.env.DB_POOL_MIN ?? (isProduction ? '2' : '0'), 10),
    acquire: parseInt(
      process.env.DB_POOL_ACQUIRE_MS ?? (isProduction ? '60000' : '30000'),
      10
    ),
    idle: parseInt(process.env.DB_POOL_IDLE_MS ?? '10000', 10),
    evict: parseInt(process.env.DB_POOL_EVICT_MS ?? '1000', 10)
  }
});

// Monitor pool health (every 30s)
let poolMonitor;
let isInstrumented = false;

/**
 * Connect to database with retry logic
 *
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<void>}
 */
export const connectDB = async (retries = null) => {
  const maxRetries =
    retries || parseInt(process.env.DB_CONNECT_RETRIES ?? '5', 10);
  const retryDelayMs = parseInt(process.env.DB_RETRY_DELAY_MS ?? '5000', 10);
  let retriesLeft = maxRetries;

  while (retriesLeft > 0) {
    try {
      // Test connection
      await sequelize.authenticate();

      infraLogger.info({
        event: 'db.connection.success',
        environment: process.env.NODE_ENV ?? 'development',
        pool_max: parseInt(
          process.env.DB_POOL_MAX ?? (isProduction ? '25' : '5'),
          10
        ),
        ssl_enabled: shouldUseSSL
      });

      // Instrument connection acquisition (only once)
      if (!isInstrumented) {
        instrumentConnectionAcquisition(sequelize);
        isInstrumented = true;
      }

      // Start pool health monitoring
      const monitorInterval = parseInt(
        process.env.POOL_MONITOR_INTERVAL_MS ?? '30000',
        10
      );
      poolMonitor = monitorPoolHealth(sequelize, monitorInterval);

      // Create missing tables/indexes on boot (does not drop or alter existing columns).
      // Disabled only when ENABLE_SYNC=false (e.g. once proper migrations are in place).
      if (process.env.ENABLE_SYNC !== 'false') {
        infraLogger.info({ event: 'db.sync.start' });
        await sequelize.sync();
        infraLogger.info({ event: 'db.sync.complete' });
      }

      return;
    } catch (error) {
      retriesLeft--;

      infraLogger.error({
        event: 'db.connection.failed',
        error_message: error.message,
        retries_left: retriesLeft
      });

      if (retriesLeft === 0) {
        infraLogger.error({
          event: 'db.connection.exhausted',
          message: 'All connection attempts failed. Exiting...'
        });
        process.exit(1);
      }

      infraLogger.warn({
        event: 'db.connection.retry',
        retries_left: retriesLeft,
        delay_ms: retryDelayMs
      });

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

/**
 * Graceful database shutdown
 *
 * WHY: Close connections cleanly on process exit
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  try {
    // Stop pool monitoring
    if (poolMonitor) {
      clearInterval(poolMonitor);
    }

    // Close all connections
    await sequelize.close();

    infraLogger.info({
      event: 'db.connection.closed',
      message: 'Database connections closed gracefully'
    });
  } catch (error) {
    infraLogger.error({
      event: 'db.connection.close_failed',
      error_message: error.message
    });
  }
}

/**
 * Health check endpoint helper
 *
 * WHY: Structured health check for Kubernetes probes
 *
 * @returns {Promise<Object>}
 */
export async function getDatabaseHealth() {
  return checkDatabaseHealth(sequelize);
}

export default { sequelize, connectDB, disconnectDB, getDatabaseHealth };
