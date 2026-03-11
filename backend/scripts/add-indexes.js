/**
 * One-time index migration script for production Render DB.
 * Run with: node scripts/add-indexes.js
 *
 * Creates missing indexes that eliminate the ~300ms slow queries:
 *  - Users.google_id
 *  - Users.github_id
 *  - Users.email (ensure it exists — it's UNIQUE but double-check)
 *  - TripMembers.UserId
 *  - TripMembers.(TripId, UserId) composite unique
 */

import { sequelize } from '../src/config/db.js';
import { logger } from '../src/utils/logger.js';

const indexes = [
  // Users table
  {
    name: 'users_google_id_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_google_id_idx" ON "Users" ("google_id") WHERE "google_id" IS NOT NULL;`
  },
  {
    name: 'users_github_id_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_github_id_idx" ON "Users" ("github_id") WHERE "github_id" IS NOT NULL;`
  },
  {
    name: 'users_email_idx',
    sql: `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "users_email_idx" ON "Users" ("email");`
  },
  {
    name: 'users_password_reset_token_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_password_reset_token_idx" ON "Users" ("passwordResetToken") WHERE "passwordResetToken" IS NOT NULL;`
  },

  // TripMembers table
  {
    name: 'trip_members_user_id_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "trip_members_user_id_idx" ON "TripMembers" ("UserId");`
  },
  {
    name: 'trip_members_trip_id_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "trip_members_trip_id_idx" ON "TripMembers" ("TripId");`
  },
  {
    name: 'trip_members_composite_unique_idx',
    sql: `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "trip_members_composite_unique_idx" ON "TripMembers" ("TripId", "UserId");`
  },

  // Trips table
  {
    name: 'trips_created_by_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "trips_created_by_idx" ON "Trips" ("created_by");`
  }
];

async function runMigration() {
  try {
    await sequelize.authenticate();
    logger.info('DB connected — running index migration');

    for (const idx of indexes) {
      try {
        logger.info(`Creating index: ${idx.name}`);
        await sequelize.query(idx.sql);
        logger.info(`✅ ${idx.name} — done`);
      } catch (err) {
        // CONCURRENTLY + IF NOT EXISTS means this should never throw,
        // but log just in case
        logger.warn(`⚠️  ${idx.name} skipped: ${err.message}`);
      }
    }

    logger.info('Index migration complete');
    process.exit(0);
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

runMigration();
