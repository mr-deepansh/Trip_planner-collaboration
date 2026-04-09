// src/middleware/requestContext.middleware.js
import { randomUUID } from 'crypto';
import { asyncLocalStorage } from '../utils/logger.js';

export const requestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] ?? randomUUID();
  const traceId = req.headers['x-trace-id'] ?? requestId;
  res.setHeader('x-request-id', requestId);
  asyncLocalStorage.run({ requestId, traceId, userId: req.user?.id }, next);
};
