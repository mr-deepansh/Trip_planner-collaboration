// src/middlewares/error.middleware.js
import ApiError from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.headers['x-request-id'];

  if (err instanceof ApiError) {
    // 4xx warn, 5xx error
    const logFn = err.statusCode >= 500 ? logger.error : logger.warn;
    logFn.call(logger, 'ApiError', {
      statusCode: err.statusCode,
      message: err.message,
      requestId,
      ...(err.statusCode >= 500 && { stack: err.stack })
    });
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data,
      requestId
    });
  }

  // Unhandled / native errors
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    requestId
  });

  return res.status(500).json({
    success: false,
    message: isProduction ? 'Internal Server Error' : err.message,
    errors: [],
    data: null,
    requestId
  });
};
