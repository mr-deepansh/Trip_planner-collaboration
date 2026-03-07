import { User } from './user.model.js';
import { Trip } from './trip.model.js';
import { TripMember } from './tripMember.model.js';
import { Day } from './day.model.js';
import { Activity } from './activity.model.js';
import { Expense } from './expense.model.js';

// Setup Associations

// A User creates many Trips (created_by)
User.hasMany(Trip, {
  foreignKey: 'created_by',
  as: 'CreatedTrips',
  onDelete: 'CASCADE'
});
Trip.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });

// Trip Members (Many-to-Many Users and Trips)
User.belongsToMany(Trip, { through: TripMember, as: 'Trips' });
Trip.belongsToMany(User, { through: TripMember, as: 'Members' });
User.hasMany(TripMember);
TripMember.belongsTo(User);
Trip.hasMany(TripMember);
TripMember.belongsTo(Trip);

// Trip and Days (One-to-Many)
Trip.hasMany(Day, { onDelete: 'CASCADE' });
Day.belongsTo(Trip);

// Days and Activities (One-to-Many)
Day.hasMany(Activity, { onDelete: 'CASCADE' });
Activity.belongsTo(Day);

// Trip and Expenses (One-to-Many)
Trip.hasMany(Expense, { onDelete: 'CASCADE' });
Expense.belongsTo(Trip);

// User and Expenses (paid_by)
User.hasMany(Expense, { foreignKey: 'paid_by' });
Expense.belongsTo(User, { foreignKey: 'paid_by' });

export { User, Trip, TripMember, Day, Activity, Expense };
