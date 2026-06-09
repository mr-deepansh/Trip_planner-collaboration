import pino from 'pino';
import { getTraceContext } from './telemetry.js';
import { redact } from './redaction.js';

function getLogLevel() {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function createTransport() {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && process.env.PRETTY_LOGS !== 'false') {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false
      }
    };
  }
  return undefined;
}

function traceMixin() {
  const traceContext = getTraceContext();
  if (!traceContext) {
    return {};
  }
  return {
    trace_id: traceContext.trace_id,
    span_id: traceContext.span_id,
    trace_flags: traceContext.trace_flags
  };
}

const serializers = {
  err: pino.stdSerializers.err,

  req: (req) => {
    if (!req) return req;
    return {
      id: req.id,
      method: req.method,
      url: req.url,
      headers: redact(req.headers),
      remoteAddress: req.socket?.remoteAddress,
      remotePort: req.socket?.remotePort
    };
  },
  res: (res) => {
    if (!res) return res;
    return {
      statusCode: res.statusCode,
      headers: redact(res.getHeaders?.())
    };
  },

  user: (user) => {
    if (!user) return user;

    return {
      id: user.id,
      email: user.email ? `${user.email[0]}***@***` : undefined,
      name: user.name
    };
  }
};

function createBaseLogger() {
  return pino({
    level: getLogLevel(),

    base: {
      service: process.env.SERVICE_NAME || 'trip-planner-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    },

    timestamp: () => `,"time":"${new Date().toISOString()}"`,

    mixin: traceMixin,

    serializers,

    transport: createTransport(),

    formatters: {
      level: (label) => {
        return { level: label };
      },

      log: (obj) => {
        return redact(obj);
      }
    },

    redact: {
      paths: [
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
        'api_key',
        '*.password',
        '*.token',
        '*.secret',
        'req.headers.authorization',
        'req.headers.cookie'
      ],
      censor: '***REDACTED***'
    }
  });
}

const baseLogger = createBaseLogger();

export const requestLogger = baseLogger.child({ channel: 'request' });

export const infraLogger = baseLogger.child({ channel: 'infrastructure' });

export const auditLogger = baseLogger.child({ channel: 'audit' });

export const logger = baseLogger;

export function createChildLogger(bindings) {
  return baseLogger.child(bindings);
}

export function logEvent(event, data = {}, level = 'info') {
  const logData = {
    event,
    ...data,
    timestamp: new Date().toISOString()
  };

  baseLogger[level](logData);
}

export async function flushLogs() {
  return new Promise((resolve) => {
    baseLogger.flush(() => {
      resolve();
    });
  });
}

export const winstonCompat = {
  info: (message, meta = {}) => {
    if (typeof message === 'string') {
      baseLogger.info(meta, message);
    } else {
      baseLogger.info(message);
    }
  },

  error: (message, meta = {}) => {
    if (typeof message === 'string') {
      baseLogger.error(meta, message);
    } else {
      baseLogger.error(message);
    }
  },

  warn: (message, meta = {}) => {
    if (typeof message === 'string') {
      baseLogger.warn(meta, message);
    } else {
      baseLogger.warn(message);
    }
  },

  debug: (message, meta = {}) => {
    if (typeof message === 'string') {
      baseLogger.debug(meta, message);
    } else {
      baseLogger.debug(message);
    }
  },

  child: (bindings) => {
    const child = baseLogger.child(bindings);
    return {
      info: (msg, meta) => child.info(meta, msg),
      error: (msg, meta) => child.error(meta, msg),
      warn: (msg, meta) => child.warn(meta, msg),
      debug: (msg, meta) => child.debug(meta, msg)
    };
  }
};

export default logger;
