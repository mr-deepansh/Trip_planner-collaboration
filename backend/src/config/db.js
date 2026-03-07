import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger.js';

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  benchmark: true,
  logging: (msg, timing) => {
    // Exclude schema sync and initial system queries that inherently take > 100ms
    if (msg.includes('information_schema') || msg.includes('ALTER TABLE')) {
      return;
    }

    // Log queries taking more than 100ms
    if (timing && timing > 100) {
      logger.warn(`[SLOW QUERY] Execution time: ${timing}ms - ${msg}`);
    } else if (process.env.NODE_ENV === 'development') {
      // Optional: log queries in development
      // logger.debug(`[QUERY] ${msg} - ${timing}ms`);
    }
  },
  pool: {
    max: 10, // maximum number of connections in pool
    min: 0, // minimum number of connections
    acquire: 30000, // max time in ms to wait for a connection
    idle: 10000 // max time in ms a connection can be idle
  }
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
