import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const TripMember = sequelize.define(
  'TripMember',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    role: {
      type: DataTypes.ENUM('OWNER', 'EDITOR', 'VIEWER'),
      defaultValue: 'VIEWER'
    }
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['TripId', 'UserId']
      },
      { fields: ['UserId'] }
    ]
  }
);

export { TripMember };
