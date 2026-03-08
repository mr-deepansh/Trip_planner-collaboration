import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger.js';

const isProduction =
  process.env.NODE_ENV === 'production' &&
  !process.env.DATABASE_URL.includes('localhost');

const shouldUseSSL = process.env.DB_SSL === 'true' || isProduction;

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',

  dialectOptions: shouldUseSSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {},
  benchmark: true,
  logging: (msg, timing) => {
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

    if (isSyncQuery) return;

    if (timing && timing > 100) {
      logger.warn(`[SLOW QUERY] ${timing}ms — ${msg}`);
    } else if (!isProduction) {
      logger.debug(`[QUERY] ${timing}ms — ${msg}`);
    }
  },

  pool: {
    max: isProduction ? 25 : 5,
    min: isProduction ? 2 : 0,
    acquire: 30000,
    idle: 10000
  }
});

export const connectDB = async (retries = 5) => {
  try {
    await sequelize.authenticate();

    logger.info(
      `PostgreSQL connected [${
        process.env.NODE_ENV || 'development'
      }] — pool max: ${isProduction ? 25 : 5}`
    );

    if (!isProduction && process.env.ENABLE_SYNC === 'true') {
      logger.info('Running database sync...');
      await sequelize.sync();
      logger.info('Database sync complete');
    }
  } catch (error) {
    logger.error(`DB connection failed: ${error.message}`);

    if (retries > 0) {
      logger.warn(`Retrying DB connection... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      logger.error('All DB connection attempts failed');
      process.exit(1);
    }
  }
};
