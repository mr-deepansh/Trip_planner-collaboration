import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Expense = sequelize.define(
    'Expense',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING,
            defaultValue: 'USD'
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING
        }
    },
    {
        timestamps: true,
        indexes: [{ fields: ['TripId'] }, { fields: ['paid_by'] }]
    }
);

export { Expense };
