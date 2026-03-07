import { Router } from 'express';
import {
  createTrip,
  getTrips,
  getTripDetails,
  addTripMember
} from '../controllers/trip.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import activityRouter from './activity.routes.js';

const router = Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

router.route('/').post(createTrip).get(getTrips);

// Protected by role middleware
router
  .route('/:tripId')
  .get(checkRole(['OWNER', 'EDITOR', 'VIEWER']), getTripDetails);

router.route('/:tripId/members').post(checkRole(['OWNER']), addTripMember);

// Nested routes for activities
router.use('/:tripId/activities', activityRouter);

export default router;
