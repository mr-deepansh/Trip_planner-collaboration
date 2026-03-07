import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Trip = sequelize.define(
  'Trip',
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
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterStartDate(value) {
          if (
            value &&
            this.start_date &&
            new Date(value) < new Date(this.start_date)
          ) {
            throw new Error('end_date must be on or after start_date');
          }
        }
      }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    } // the foreign key
  },
  {
    timestamps: true,
    indexes: [{ fields: ['created_by'] }]
  }
);

export { Trip };
