import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT
} from '@opentelemetry/semantic-conventions';
import {
  AlwaysOnSampler,
  TraceIdRatioBasedSampler,
  ParentBasedSampler
} from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

function configureDiagnostics() {
  if (process.env.OTEL_DEBUG === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }
}

function createSampler() {
  const sampleRate = parseFloat(process.env.OTEL_TRACE_SAMPLE_RATE || '0.1');

  if (sampleRate >= 1.0) {
    return new AlwaysOnSampler();
  }

  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(sampleRate)
  });
}

function createTraceExporter() {
  const endpoint =
    process.env.OTLP_TRACE_ENDPOINT || 'http://localhost:4318/v1/traces';
  const timeoutMs = parseInt(process.env.OTLP_TIMEOUT_MS || '5000', 10);

  return new OTLPTraceExporter({
    url: endpoint,
    headers: {
      ...(process.env.DD_API_KEY && {
        'DD-API-KEY': process.env.DD_API_KEY
      }),
      ...(process.env.OTLP_HEADERS && JSON.parse(process.env.OTLP_HEADERS))
    },
    timeoutMillis: timeoutMs
  });
}

function createResource() {
  return new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME || 'trip-planner-api',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  });
}

export function initTelemetry() {
  configureDiagnostics();

  const sdk = new NodeSDK({
    resource: createResource(),
    traceExporter: createTraceExporter(),
    sampler: createSampler(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': {
          enabled: true,
          requestHook: (span, info) => {
            if (info.route) {
              span.setAttribute('http.route', info.route);
            }
          }
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span, request) => {
            if (request.headers?.authorization) {
              span.setAttribute(
                'http.request.header.authorization',
                '[REDACTED]'
              );
            }
          },
          responseHook: (span, response) => {
            if (response.headers?.['set-cookie']) {
              span.setAttribute(
                'http.response.header.set_cookie',
                '[REDACTED]'
              );
            }
          }
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
          enhancedDatabaseReporting: false
        },
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false }
      })
    ]
  });

  sdk.start();

  process.on('SIGTERM', async () => {
    try {
      await sdk.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    } catch (err) {
      console.error('Error shutting down OpenTelemetry SDK', err);
    } finally {
      process.exit(0);
    }
  });

  return sdk;
}

import { trace, context as otelContext } from '@opentelemetry/api';

export function getTracer() {
  return trace.getTracer(
    process.env.SERVICE_NAME || 'trip-planner-api',
    process.env.npm_package_version || '1.0.0'
  );
}

export function getTraceContext() {
  const span = trace.getSpan(otelContext.active());

  if (!span) {
    return null;
  }

  const spanContext = span.spanContext();
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
    trace_flags: spanContext.traceFlags
  };
}

export async function withSpan(name, fn, attributes = {}) {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { attributes });

  try {
    const result = await fn(span);
    span.setStatus({ code: 1 });
    return result;
  } catch (error) {
    span.setStatus({ code: 2, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

export default {
  initTelemetry,
  getTracer,
  getTraceContext,
  withSpan
};
