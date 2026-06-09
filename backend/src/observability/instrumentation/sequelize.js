// src/observability/instrumentation/sequelize.js

/**
 * Sequelize Database Telemetry
 *
 * WHY: Monitor DB pool health, slow queries, connection starvation
 *
 * Captures:
 * - Query duration
 * - Pool wait time
 * - Active/idle connections
 * - Slow query detection
 * - Pool starvation events
 *
 * NEVER logs raw SQL (PII exposure risk)
 */

import { infraLogger } from '../logger.js';
import { getTraceContext, withSpan } from '../telemetry.js';

/**
 * Extract query name from Sequelize query
 *
 * WHY: Low-cardinality identifier (not raw SQL)
 *
 * @param {string} sql - SQL query
 * @returns {string}
 *
 * @example
 * extractQueryName('SELECT * FROM users WHERE id = $1')
 * // → 'SELECT users'
 */
function extractQueryName(sql) {
  if (!sql) return 'unknown';

  // Remove newlines and extra spaces
  const normalized = sql.replace(/\s+/g, ' ').trim();

  // Extract operation and table
  const match = normalized.match(
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+(?:INTO\s+|FROM\s+)?(\w+)/i
  );

  if (match) {
    const [, operation, table] = match;
    return `${operation.toUpperCase()} ${table}`;
  }

  // Fallback: just operation
  const opMatch = normalized.match(/^(\w+)/);
  return opMatch ? opMatch[1].toUpperCase() : 'unknown';
}

/**
 * Check if query should be ignored (schema sync, migrations)
 *
 * WHY: Reduce noise from Sequelize internal queries
 *
 * @param {string} sql - SQL query
 * @returns {boolean}
 */
function shouldIgnoreQuery(sql) {
  const ignorePatterns = [
    'information_schema',
    'pg_class',
    'pg_attribute',
    'pg_index',
    'pg_namespace',
    'ALTER TABLE',
    'CREATE TABLE',
    'CREATE INDEX',
    'CREATE TYPE',
    'CREATE UNIQUE INDEX'
  ];

  return ignorePatterns.some((pattern) => sql.includes(pattern));
}

/**
 * Get current pool statistics
 *
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Object}
 */
function getPoolStats(sequelize) {
  const pool = sequelize.connectionManager?.pool;

  if (!pool) {
    return {
      active: 0,
      idle: 0,
      total: 0
    };
  }

  return {
    active: pool._inUseObjects?.length || 0,
    idle: pool._availableObjects?.length || 0,
    total: pool.size || 0,
    max: pool._config?.max || 0,
    min: pool._config?.min || 0
  };
}

/**
 * Configure Sequelize logging with structured telemetry
 *
 * WHY: Replace string-based logging with structured events
 *
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {Object} options - Configuration options
 * @returns {Function} Logging function
 *
 * @example
 * const sequelize = new Sequelize(url, {
 *   logging: createSequelizeLogger(sequelize, { slowQueryMs: 100 })
 * });
 */
export function createSequelizeLogger(sequelize, options = {}) {
  const {
    slowQueryMs = 100,
    logAllQueries = process.env.NODE_ENV !== 'production'
  } = options;

  return (sql, timing) => {
    // Ignore schema sync queries
    if (shouldIgnoreQuery(sql)) {
      return;
    }

    const queryName = extractQueryName(sql);
    const poolStats = getPoolStats(sequelize);
    const traceContext = getTraceContext();

    const logData = {
      event: 'db.query',
      query_name: queryName,
      duration_ms: timing,
      pool_active: poolStats.active,
      pool_idle: poolStats.idle,
      pool_total: poolStats.total,
      ...(traceContext && {
        trace_id: traceContext.trace_id,
        span_id: traceContext.span_id
      })
    };

    // Slow query warning
    if (timing > slowQueryMs) {
      infraLogger.warn({
        ...logData,
        event: 'db.query.slow',
        threshold_ms: slowQueryMs
      });
      return;
    }

    // Log all queries in development
    if (logAllQueries) {
      infraLogger.debug(logData);
    }
  };
}

/**
 * Monitor database pool health
 *
 * WHY: Detect pool starvation before it causes failures
 *
 * @param {Sequelize} sequelize - Sequelize instance
 * @param {number} intervalMs - Check interval (default: 30s)
 * @returns {NodeJS.Timer}
 *
 * @example
 * const monitor = monitorPoolHealth(sequelize, 30000);
 * // Stop monitoring: clearInterval(monitor);
 */
export function monitorPoolHealth(sequelize, intervalMs = null) {
  const interval =
    intervalMs || parseInt(process.env.POOL_MONITOR_INTERVAL_MS || '30000', 10);

  return setInterval(() => {
    const poolStats = getPoolStats(sequelize);

    // Pool starvation: all connections in use
    if (poolStats.active >= poolStats.max) {
      infraLogger.warn({
        event: 'db.pool.starvation',
        active_connections: poolStats.active,
        max_connections: poolStats.max,
        idle_connections: poolStats.idle
      });
    }

    // Pool health check
    infraLogger.debug({
      event: 'db.pool.health',
      ...poolStats
    });
  }, intervalMs);
}

/**
 * Instrument Sequelize connection acquisition
 *
 * WHY: Track time spent waiting for connections
 *
 * @param {Sequelize} sequelize - Sequelize instance
 */
export function instrumentConnectionAcquisition(sequelize) {
  const originalAcquire = sequelize.connectionManager.getConnection;

  sequelize.connectionManager.getConnection = async function (...args) {
    const startTime = Date.now();

    try {
      const connection = await originalAcquire.apply(this, args);
      const waitTime = Date.now() - startTime;

      // Log slow connection acquisition
      const slowAcquireThreshold = parseInt(
        process.env.SLOW_CONNECTION_ACQUIRE_MS || '100',
        10
      );
      if (waitTime > slowAcquireThreshold) {
        infraLogger.warn({
          event: 'db.connection.slow_acquire',
          wait_ms: waitTime,
          pool_stats: getPoolStats(sequelize)
        });
      }

      return connection;
    } catch (error) {
      const waitTime = Date.now() - startTime;

      infraLogger.error({
        event: 'db.connection.acquire_failed',
        wait_ms: waitTime,
        error_message: error.message,
        pool_stats: getPoolStats(sequelize)
      });

      throw error;
    }
  };
}

/**
 * Wrap Sequelize query with OpenTelemetry span
 *
 * WHY: Correlate DB queries with HTTP requests in traces
 *
 * @param {string} queryName - Query identifier
 * @param {Function} queryFn - Query function
 * @returns {Promise<*>}
 *
 * @example
 * const user = await instrumentQuery('User.findByPk', () => {
 *   return User.findByPk(userId);
 * });
 */
export async function instrumentQuery(queryName, queryFn) {
  return withSpan(
    'db.query',
    async (span) => {
      span.setAttribute('db.operation', queryName);
      span.setAttribute('db.system', 'postgresql');

      const startTime = Date.now();
      try {
        const result = await queryFn();
        const duration = Date.now() - startTime;

        span.setAttribute('db.duration_ms', duration);

        return result;
      } catch (error) {
        span.setAttribute('db.error', error.message);
        throw error;
      }
    },
    { 'db.operation': queryName }
  );
}

/**
 * Log database connection events
 *
 * WHY: Track connection lifecycle for debugging
 *
 * @param {Sequelize} sequelize - Sequelize instance
 */
export function logConnectionEvents(sequelize) {
  sequelize.connectionManager.on('connect', () => {
    infraLogger.debug({
      event: 'db.connection.established',
      pool_stats: getPoolStats(sequelize)
    });
  });

  sequelize.connectionManager.on('disconnect', () => {
    infraLogger.debug({
      event: 'db.connection.closed',
      pool_stats: getPoolStats(sequelize)
    });
  });
}

/**
 * Health check with telemetry
 *
 * WHY: Structured health check events (not raw SQL logs)
 *
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Promise<Object>}
 *
 * @example
 * const health = await checkDatabaseHealth(sequelize);
 * // { status: 'UP', latency_ms: 42, pool: { ... } }
 */
export async function checkDatabaseHealth(sequelize) {
  const startTime = Date.now();

  try {
    await sequelize.authenticate();
    const latency = Date.now() - startTime;
    const poolStats = getPoolStats(sequelize);

    infraLogger.info({
      event: 'db.health.check',
      status: 'UP',
      latency_ms: latency,
      pool_stats: poolStats
    });

    return {
      status: 'UP',
      latency_ms: latency,
      pool: poolStats
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    infraLogger.error({
      event: 'db.health.check',
      status: 'DOWN',
      latency_ms: latency,
      error_message: error.message
    });

    return {
      status: 'DOWN',
      latency_ms: latency,
      error: error.message
    };
  }
}

export default {
  createSequelizeLogger,
  monitorPoolHealth,
  instrumentConnectionAcquisition,
  instrumentQuery,
  logConnectionEvents,
  checkDatabaseHealth
};
