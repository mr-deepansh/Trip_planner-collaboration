import winston from 'winston';
import 'winston-daily-rotate-file';
import { AsyncLocalStorage } from 'async_hooks';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;
export const asyncLocalStorage = new AsyncLocalStorage();
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie'
];

const maskSensitive = winston.format((info) => {
  const mask = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        SENSITIVE_FIELDS.some((f) => k.toLowerCase().includes(f))
          ? '***REDACTED***'
          : mask(v)
      ])
    );
  };
  return { ...info, ...mask(info) };
});

const injectContext = winston.format((info) => {
  const ctx = asyncLocalStorage.getStore();
  if (ctx) {
    info.requestId = ctx.requestId;
    info.userId = ctx.userId ?? 'anonymous';
    info.traceId = ctx.traceId;
  }
  return info;
});

const isProduction = process.env.NODE_ENV === 'production';

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  injectContext(),
  printf(({ level, message, timestamp, stack, requestId }) => {
    const reqPart = requestId ? ` [${requestId}]` : '';
    return `[${timestamp}]${reqPart} ${level}: ${stack || message}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  maskSensitive(),
  injectContext(),
  json()
);

const rotateOptions = (level) => ({
  filename: `logs/${level}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level,
  format: prodFormat
});

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: {
    service: process.env.SERVICE_NAME ?? 'trip-planner-api',
    version: process.env.npm_package_version ?? '0.0.0',
    env: process.env.NODE_ENV
  },
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile(rotateOptions('error')),
    new winston.transports.DailyRotateFile(rotateOptions('combined'))
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});
