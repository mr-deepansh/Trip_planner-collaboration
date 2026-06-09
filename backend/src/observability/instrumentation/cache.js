// src/observability/instrumentation/cache.js

/**
 * Cache Telemetry
 *
 * WHY: Monitor cache effectiveness (hit rate, evictions)
 *
 * Captures:
 * - Cache hits/misses
 * - Cache size
 * - Eviction events
 * - TTL expirations
 */

import { infraLogger } from '../logger.js';
import { getTraceContext } from '../telemetry.js';

/**
 * Instrument cache get operation
 *
 * @param {string} key - Cache key
 * @param {Function} getFn - Function to get value
 * @param {boolean} hit - Whether cache hit occurred
 * @returns {*}
 *
 * @example
 * const value = instrumentCacheGet('user:123', () => cache.get('user:123'), !!value);
 */
export function instrumentCacheGet(key, getFn, hit) {
  const startTime = Date.now();
  const result = getFn();
  const duration = Date.now() - startTime;
  const traceContext = getTraceContext();

  infraLogger.debug({
    event: hit ? 'cache.hit' : 'cache.miss',
    cache_key: key,
    duration_ms: duration,
    ...(traceContext && {
      trace_id: traceContext.trace_id,
      span_id: traceContext.span_id
    })
  });

  return result;
}

/**
 * Instrument cache set operation
 *
 * @param {string} key - Cache key
 * @param {Function} setFn - Function to set value
 * @param {number} ttl - TTL in milliseconds
 *
 * @example
 * instrumentCacheSet('user:123', () => cache.set('user:123', user), 60000);
 */
export function instrumentCacheSet(key, setFn, ttl) {
  const startTime = Date.now();
  setFn();
  const duration = Date.now() - startTime;

  infraLogger.debug({
    event: 'cache.set',
    cache_key: key,
    ttl_ms: ttl,
    duration_ms: duration
  });
}

/**
 * Log cache eviction
 *
 * @param {string} key - Cache key
 * @param {string} reason - Eviction reason (ttl, manual, size)
 */
export function logCacheEviction(key, reason = 'ttl') {
  infraLogger.debug({
    event: 'cache.eviction',
    cache_key: key,
    reason
  });
}

/**
 * Log cache statistics
 *
 * @param {Object} stats - Cache statistics
 *
 * @example
 * logCacheStats({ size: 100, hits: 850, misses: 150, hit_rate: 0.85 });
 */
export function logCacheStats(stats) {
  infraLogger.info({
    event: 'cache.stats',
    ...stats
  });
}

export default {
  instrumentCacheGet,
  instrumentCacheSet,
  logCacheEviction,
  logCacheStats
};
