import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Activity = sequelize.define(
  'Activity',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    start_time: {
      type: DataTypes.TIME
    },
    end_time: {
      type: DataTypes.TIME,
      validate: {
        isAfterStartTime(value) {
          if (this.start_time && value && value < this.start_time) {
            throw new Error('end_time must be after start_time');
          }
        }
      }
    },
    order_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    type: {
      type: DataTypes.ENUM('FLIGHT', 'HOTEL', 'SIGHTSEEING', 'FOOD', 'OTHER'),
      defaultValue: 'OTHER'
    }
  },
  {
    timestamps: true,
    indexes: [{ fields: ['DayId', 'order_index'] }]
  }
);

export { Activity };
