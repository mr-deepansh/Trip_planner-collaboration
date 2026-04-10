import { Trip, Day, TripMember, Activity } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateDaysForTrip = async (tripId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      TripId: tripId,
      date: new Date(d).toISOString().split('T')[0] // local format or raw date
    });
  }
  await Day.bulkCreate(days);
};

export const createTrip = asyncHandler(async (req, res) => {
  const { title, start_date, end_date } = req.body;

  if (!title || !start_date || !end_date) {
    throw new ApiError(400, 'Title, start_date, and end_date are required');
  }
  // 1. Create Trip
  const trip = await Trip.create({
    title,
    start_date,
    end_date,
    created_by: req.user.id
  });
  // 2. Add creator as OWNER
  await TripMember.create({
    TripId: trip.id,
    UserId: req.user.id,
    role: 'OWNER'
  });
  // 3. Generate Days
  await generateDaysForTrip(trip.id, start_date, end_date);
  return res
    .status(201)
    .json(new ApiResponse(201, trip, 'Trip created successfully'));
});

export const getTrips = asyncHandler(async (req, res) => {
  // Query from TripMember (junction table) directly instead of loading the full User object.
  // This eliminates a massive left-outer-join across all 9 User columns.
  // At 10M users scale this is the correct direction: narrow → wide, not wide → narrow.
  const memberships = await TripMember.findAll({
    where: { UserId: req.user.id },
    attributes: ['role'],
    include: [
      {
        model: Trip,
        attributes: [
          'id',
          'title',
          'start_date',
          'end_date',
          'created_by',
          'createdAt',
          'updatedAt'
        ]
      }
    ]
  });

  // Flatten into the same shape the frontend already expects: trip + TripMember.role
  const trips = memberships.map((m) => ({
    ...m.Trip.toJSON(),
    TripMember: { role: m.role }
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, trips, 'Trips fetched successfully'));
});

export const getTripDetails = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { User } = await import('../models/index.js');

  const trip = await Trip.findByPk(tripId, {
    include: [
      {
        model: Day,
        include: [Activity]
      },
      {
        model: User,
        as: 'Members',
        attributes: ['id', 'name', 'email'],
        through: { attributes: ['role'] }
      }
    ],
    order: [[Day, 'date', 'ASC']]
  });
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, trip, 'Trip details fetched successfully'));
});

export const addTripMember = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { email, role } = req.body;

  if (!email || !role) {
    throw new ApiError(400, 'Email and role are required for invitation');
  }
  const validRoles = ['OWNER', 'EDITOR', 'VIEWER'];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, 'Invalid role provided');
  }
  // here dynamic import
  const { User, TripMember } = await import('../models/index.js');
  const userToAdd = await User.findOne({ where: { email } });
  if (!userToAdd) {
    throw new ApiError(
      404,
      'User with this email not found. They must sign up first.'
    );
  }
  const existingMember = await TripMember.findOne({
    where: { TripId: tripId, UserId: userToAdd.id }
  });
  if (existingMember) {
    throw new ApiError(400, 'User is already a member of this trip');
  }
  const newMember = await TripMember.create({
    TripId: tripId,
    UserId: userToAdd.id,
    role: role
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        member: newMember,
        user: { name: userToAdd.name, email: userToAdd.email }
      },
      'Member added to trip successfully'
    )
  );
});
