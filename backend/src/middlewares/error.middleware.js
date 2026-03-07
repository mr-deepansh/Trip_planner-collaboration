import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data
    });
  }

  // Unhandled or native errors
  logger.error(`${err.message}\n${err.stack || ''}`);

  return res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: [],
    data: null
  });
};

export { errorHandler };
