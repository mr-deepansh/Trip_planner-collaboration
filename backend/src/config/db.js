import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger.js';

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  benchmark: true,
  logging: (msg, timing) => {
    // Exclude schema sync and initial system queries that inherently take > 100ms
    const isSyncQuery =
      msg.includes('information_schema') ||
      msg.includes('ALTER TABLE') ||
      msg.includes('CREATE TABLE') ||
      msg.includes('CREATE INDEX') ||
      msg.includes('CREATE TYPE') ||
      msg.includes('CREATE UNIQUE INDEX') ||
      msg.includes('pg_class') ||
      msg.includes('pg_attribute') ||
      msg.includes('pg_index');

    if (isSyncQuery) {
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
    max: 25, // increase max connections for higher throughput per instance
    min: 2, // maintain minimum standing connections to reduce cold-query latency
    acquire: 30000, // max time in ms to wait for a connection
    idle: 10000 // max time in ms a connection can be idle
  }
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL Database Connected Successfully');

    // ⛔ HIGH SCALE / PRODUCTION RULE:
    // Never run sequelize.sync() on application startup in production with 10M users.
    // It issues blocking queries to check schema state which locks up DB instances
    // and impacts startup times significantly.
    // Instead: Use an external migration runner (like sequelize-cli migrations) during CI/CD.
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.ENABLE_SYNC === 'true'
    ) {
      logger.info('Running database sync in development mode...');
      await sequelize.sync({ alter: true });
    }
  } catch (error) {
    logger.error(`Unable to connect to the database: ${error.message}`);
    process.exit(1);
  }
};
