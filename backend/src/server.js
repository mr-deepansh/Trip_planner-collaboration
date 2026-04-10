import app from './app.js';
import './models/index.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

const REQUIRED_ENV_VARS = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CORS_ORIGIN',
  'BACKEND_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET'
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  logger.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT;
const ENV = process.env.NODE_ENV;
let server;

async function startServer() {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      logger.info(`Server running in [${ENV}] mode on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(
          `Port ${PORT} is already in use. Try another port or stop the existing process.`
        );
        process.exit(1);
      }

      logger.error(`Server error: ${err.message}`);
      process.exit(1);
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(signal) {
  logger.info(`Received ${signal || 'shutdown'} — closing server...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed gracefully');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
  } else {
    process.exit(0);
  }
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer();
