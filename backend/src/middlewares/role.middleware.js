import ApiError from '../utils/apiError.js';
import { TripMember } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const checkRole = (allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    // req.user is set by verifyJWT middleware
    const tripId = req.params.tripId || req.body.tripId;

    if (!tripId) {
      throw ApiError.badRequest('Trip ID is missing in request');
    }
    const membership = await TripMember.findOne({
      where: {
        TripId: tripId,
        UserId: req.user.id
      }
    });
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this trip');
    }
    if (!allowedRoles.includes(membership.role)) {
      throw ApiError.forbidden(
        'You do not have the required permissions to perform this action'
      );
    }
    req.tripRole = membership.role;
    next();
  });
