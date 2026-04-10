// src/config/db.js
import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger.js';

const isProduction =
  process.env.NODE_ENV === 'production' &&
  !process.env.DATABASE_URL?.includes('localhost');

const shouldUseSSL = process.env.DB_SSL === 'true' || isProduction;
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD ?? '100', 10);

const SYNC_QUERY_PATTERNS = [
  'information_schema',
  'ALTER TABLE',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE TYPE',
  'CREATE UNIQUE INDEX',
  'pg_class',
  'pg_attribute',
  'pg_index'
];

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: shouldUseSSL
    ? {
        ssl: { require: true, rejectUnauthorized: false }
      }
    : {},
  benchmark: true,
  logging: (msg, timing) => {
    if (SYNC_QUERY_PATTERNS.some((p) => msg.includes(p))) {
      return;
    }
    if (timing > SLOW_QUERY_MS) {
      logger.warn(`[SLOW QUERY] ${timing}ms — ${msg}`);
    } else if (!isProduction) {
      logger.debug(`[QUERY] ${timing}ms — ${msg}`);
    }
  },
  pool: {
    max: isProduction ? 25 : 5,
    min: isProduction ? 2 : 0,
    acquire: isProduction ? 60000 : 30000,
    idle: 10000,
    evict: 1000
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      logger.info(
        `PostgreSQL connected [${process.env.NODE_ENV ?? 'development'}] — pool max: ${isProduction ? 25 : 5}`
      );
      if (!isProduction && process.env.ENABLE_SYNC === 'true') {
        logger.info('Running database sync...');
        await sequelize.sync();
        logger.info('Database sync complete');
      }
      return;
    } catch (error) {
      retries--;
      logger.error(`DB connection failed: ${error.message}`);
      if (retries === 0) {
        logger.error('All DB connection attempts failed. Exiting...');
        process.exit(1);
      }
      logger.warn(`Retrying DB connection... (${retries} attempts left)`);
      await delay(5000);
    }
  }
};
