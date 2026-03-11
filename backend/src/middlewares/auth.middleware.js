import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { getCachedUser, setCachedUser } from '../utils/userCache.js';
import { logger } from '../utils/logger.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // DEBUG: log all incoming cookies and Authorization header
    logger.debug(
      `[verifyJWT] Cookies received: ${JSON.stringify(req.cookies)}`
    );
    logger.debug(
      `[verifyJWT] Authorization header: ${req.header('Authorization') || 'none'}`
    );

    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      logger.warn('[verifyJWT] No token found — rejecting with 401');
      throw new ApiError(401, 'Unauthorized request');
    }

    logger.debug(
      `[verifyJWT] Token source: ${req.cookies?.accessToken ? 'cookie' : 'Authorization header'}`
    );
    logger.debug(
      `[verifyJWT] Token (first 30 chars): ${token.slice(0, 30)}...`
    );

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug(
      `[verifyJWT] Decoded token payload: ${JSON.stringify(decodedToken)}`
    );

    // 1. Try cache first — avoids DB query on every request
    let user = getCachedUser(decodedToken.id);

    if (user) {
      logger.debug(`[verifyJWT] Cache HIT for userId=${decodedToken.id}`);
    } else {
      logger.debug(
        `[verifyJWT] Cache MISS for userId=${decodedToken.id} — querying DB`
      );

      // 2. Cache miss: fetch from DB, select only what middlewares need
      user = await User.findByPk(decodedToken.id, {
        attributes: [
          'id',
          'name',
          'email',
          'auth_provider',
          'google_id',
          'github_id'
        ]
      });

      if (!user) {
        logger.warn(
          `[verifyJWT] No user found in DB for id=${decodedToken.id}`
        );
        throw new ApiError(401, 'Invalid Access Token');
      }

      logger.debug(
        `[verifyJWT] DB user found: ${JSON.stringify(user.toJSON())}`
      );

      // 3. Populate cache (60s TTL)
      setCachedUser(decodedToken.id, user.toJSON());
      logger.debug(`[verifyJWT] User cached for userId=${decodedToken.id}`);
    }

    req.user = user;
    logger.debug(
      `[verifyJWT] req.user set → id=${user.id}, email=${user.email}`
    );
    next();
  } catch (error) {
    logger.error(`[verifyJWT] Auth failed: ${error?.message}`);
    logger.debug(`[verifyJWT] Error stack: ${error?.stack}`);
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});
