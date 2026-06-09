import { requestLogger } from '../logger.js';
import { getTraceContext } from '../telemetry.js';

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function getRouteTemplate(req) {
  if (req.route?.path) {
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${req.route.path}`;
  }

  return req.path || req.url;
}

function getRequestSize(req) {
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  if (req.body) {
    return Buffer.byteLength(JSON.stringify(req.body));
  }

  return 0;
}

function getResponseSize(res) {
  const contentLength = res.getHeader('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  return 0;
}

function getLogLevel(statusCode) {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

export function httpTelemetry() {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const traceContext = getTraceContext();

      const logData = {
        event: 'http.request.completed',
        method: req.method,
        route: getRouteTemplate(req),
        url: req.url,
        status_code: res.statusCode,
        duration_ms: duration,
        request_size_bytes: getRequestSize(req),
        response_size_bytes: getResponseSize(res),
        client_ip: getClientIP(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        ...(req.user?.id && { user_id: req.user.id }),
        ...(traceContext && {
          trace_id: traceContext.trace_id,
          span_id: traceContext.span_id
        })
      };

      const level = getLogLevel(res.statusCode);
      requestLogger[level](logData);
    });

    next();
  };
}

export function slowRequestDetector(thresholdMs = null) {
  const threshold =
    thresholdMs ||
    parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10);

  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        const traceContext = getTraceContext();

        requestLogger.warn({
          event: 'http.request.slow',
          method: req.method,
          route: getRouteTemplate(req),
          duration_ms: duration,
          threshold_ms: threshold,
          ...(traceContext && {
            trace_id: traceContext.trace_id,
            span_id: traceContext.span_id
          })
        });
      }
    });

    next();
  };
}

export function largePayloadDetector(thresholdBytes = null) {
  const threshold =
    thresholdBytes ||
    parseInt(process.env.LARGE_PAYLOAD_THRESHOLD_BYTES || '1048576', 10);

  return (req, res, next) => {
    const requestSize = getRequestSize(req);

    if (requestSize > threshold) {
      requestLogger.warn({
        event: 'http.request.large_payload',
        method: req.method,
        route: getRouteTemplate(req),
        request_size_bytes: requestSize,
        threshold_bytes: threshold
      });
    }

    next();
  };
}

export function logErrorResponse(err, req, res) {
  const traceContext = getTraceContext();

  requestLogger.error({
    event: 'http.request.error',
    method: req.method,
    route: getRouteTemplate(req),
    url: req.url,
    error_name: err.name,
    error_message: err.message,
    error_stack: err.stack,
    status_code: res.statusCode || 500,
    ...(req.user?.id && { user_id: req.user.id }),
    ...(traceContext && {
      trace_id: traceContext.trace_id,
      span_id: traceContext.span_id
    })
  });
}

export default {
  httpTelemetry,
  slowRequestDetector,
  largePayloadDetector,
  logErrorResponse
};
