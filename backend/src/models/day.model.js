import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Day = sequelize.define(
  'Day',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  },
  {
    timestamps: true,
    indexes: [{ unique: true, fields: ['TripId', 'date'] }]
  }
);

export { Day };
