// src/middlewares/error.middleware.js

/**
 * Error Handling Middleware with Structured Logging
 *
 * WHY: Replace Winston string logs with structured error events
 *
 * Changes from original:
 * - Structured error logging (not strings)
 * - OpenTelemetry span error recording
 * - Separate audit logs for security errors
 * - No raw SQL exposure
 */

import ApiError from '../utils/apiError.js';
import { requestLogger, auditLogger } from '../observability/logger.js';
import { getTraceContext } from '../observability/telemetry.js';
import { trace } from '@opentelemetry/api';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determine if error is security-related
 *
 * WHY: Route to audit logger for compliance
 *
 * @param {Error} err - Error object
 * @returns {boolean}
 */
function isSecurityError(err) {
  const securityCodes = [401, 403];
  return err instanceof ApiError && securityCodes.includes(err.statusCode);
}

/**
 * Sanitize error for client response
 *
 * WHY: Never expose internal details in production
 *
 * @param {Error} err - Error object
 * @returns {Object}
 */
function sanitizeError(err) {
  if (isProduction && !(err instanceof ApiError)) {
    return {
      message: 'Internal Server Error',
      details: null
    };
  }

  return {
    message: err.message,
    details: err instanceof ApiError ? err.errors : null
  };
}

/**
 * Record error in OpenTelemetry span
 *
 * WHY: Correlate errors with traces
 *
 * @param {Error} err - Error object
 */
function recordSpanError(err) {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message }); // ERROR
  }
}

/**
 * Error handler middleware
 *
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Prevent double-sending response
  if (res.headersSent) {
    return next(err);
  }

  const traceContext = getTraceContext();
  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  // Record error in active span
  recordSpanError(err);

  // Base error log data
  const errorLogData = {
    event: 'http.request.error',
    error_name: err.name,
    error_message: err.message,
    status_code: statusCode,
    method: req.method,
    url: req.url,
    ...(req.user?.id && { user_id: req.user.id }),
    ...(traceContext && {
      trace_id: traceContext.trace_id,
      span_id: traceContext.span_id
    })
  };

  // Handle ApiError (expected errors)
  if (err instanceof ApiError) {
    const logFn = statusCode >= 500 ? requestLogger.error : requestLogger.warn;

    logFn({
      ...errorLogData,
      ...(statusCode >= 500 && { error_stack: err.stack })
    });

    // Security errors → audit log
    if (isSecurityError(err)) {
      auditLogger.warn({
        event: 'security.access_denied',
        user_id: req.user?.id || 'anonymous',
        ip: req.socket?.remoteAddress,
        method: req.method,
        url: req.url,
        status_code: statusCode,
        reason: err.message
      });
    }

    return res.status(statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      data: null,
      ...(traceContext && { trace_id: traceContext.trace_id })
    });
  }

  // Unhandled errors (500)
  requestLogger.error({
    ...errorLogData,
    error_stack: err.stack,
    // Sequelize errors: log metadata (NOT raw SQL)
    ...(err.name === 'SequelizeDatabaseError' && {
      db_error: true,
      db_error_code: err.original?.code,
      db_error_detail: err.original?.detail
      // ❌ NEVER log: err.sql, err.parameters
    })
  });

  const sanitized = sanitizeError(err);

  return res.status(500).json({
    success: false,
    message: sanitized.message,
    errors: [],
    data: null,
    ...(traceContext && { trace_id: traceContext.trace_id })
  });
};

/**
 * 404 Not Found handler
 *
 * WHY: Structured logging for unmatched routes
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const notFoundHandler = (req, res) => {
  const traceContext = getTraceContext();

  requestLogger.warn({
    event: 'http.route.not_found',
    method: req.method,
    url: req.url,
    ...(traceContext && {
      trace_id: traceContext.trace_id,
      span_id: traceContext.span_id
    })
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: [],
    data: null,
    ...(traceContext && { trace_id: traceContext.trace_id })
  });
};

export default { errorHandler, notFoundHandler };
