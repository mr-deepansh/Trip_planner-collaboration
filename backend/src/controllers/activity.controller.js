import { Activity, Day } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createActivity = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { dayId, title, description, start_time, end_time, type } = req.body;

  if (!dayId || !title) {
    throw new ApiError(400, 'dayId and title are required');
  }
  // Verify day belongs to trip
  const day = await Day.findOne({ where: { id: dayId, TripId: tripId } });
  if (!day) {
    throw new ApiError(404, 'Day not found in this trip');
  }
  // Get max order_index for the day
  const maxOrder = await Activity.max('order_index', {
    where: { DayId: dayId }
  });
  const orderIndex = maxOrder ? maxOrder + 1 : 0;
  const activity = await Activity.create({
    title,
    description,
    start_time,
    end_time,
    type,
    order_index: orderIndex,
    DayId: dayId
  });
  return res
    .status(201)
    .json(new ApiResponse(201, activity, 'Activity created successfully'));
});

export const updateActivity = asyncHandler(async (req, res) => {
  const { activityId } = req.params;
  const updates = req.body;

  const activity = await Activity.findByPk(activityId);
  if (!activity) {
    throw new ApiError(404, 'Activity not found');
  }
  const updatedActivity = await activity.update(updates);
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedActivity, 'Activity updated successfully')
    );
});

export const deleteActivity = asyncHandler(async (req, res) => {
  const { activityId } = req.params;

  const activity = await Activity.findByPk(activityId);
  if (!activity) {
    throw new ApiError(404, 'Activity not found');
  }
  await activity.destroy();
  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Activity deleted successfully'));
});

export const reorderActivities = asyncHandler(async (req, res) => {
  // Expected payload: [{ id: "uuid", order_index: 0 }, { id: "uuid-2", order_index: 1 }]
  // const { tripId } = req.params; // No longer needed for updating order directly by activity id
  const { activities } = req.body;

  if (!Array.isArray(activities)) {
    throw new ApiError(400, 'Activities array is required');
  }
  for (const item of activities) {
    if (item.id && item.order_index !== undefined) {
      await Activity.update(
        { order_index: item.order_index },
        { where: { id: item.id } }
      );
    }
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Activities reordered successfully'));
});
