import { Router } from 'express';
import {
    createActivity,
    updateActivity,
    deleteActivity,
    reorderActivities
} from '../controllers/activity.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router({ mergeParams: true });
// Apply auth middleware to all routes
router.use(verifyJWT);

router.post('/', checkRole(['OWNER', 'EDITOR']), createActivity);

// Reorder Activity
router.post('/reorder', checkRole(['OWNER', 'EDITOR']), reorderActivities);

// Update/Delete Activity
router.put('/:activityId', checkRole(['OWNER', 'EDITOR']), updateActivity);
router.delete('/:activityId', checkRole(['OWNER', 'EDITOR']), deleteActivity);

export default router;
