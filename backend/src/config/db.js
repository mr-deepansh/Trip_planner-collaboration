import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('PostgreSQL Database Connected Successfully');
        await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    } catch (error) {
        logger.error(`Unable to connect to the database: ${error.message}`);
        process.exit(1);
    }
};
