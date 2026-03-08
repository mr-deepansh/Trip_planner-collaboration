import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { getCachedUser, setCachedUser } from '../utils/userCache.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new ApiError(401, 'Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // 1. Try cache first — avoids DB query on every request
    let user = getCachedUser(decodedToken.id);

    if (!user) {
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
        throw new ApiError(401, 'Invalid Access Token');
      }
      // 3. Populate cache (60s TTL)
      setCachedUser(decodedToken.id, user.toJSON());
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});
