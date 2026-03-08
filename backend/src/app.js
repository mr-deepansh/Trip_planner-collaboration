import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware.js';
import authRouter from './routes/auth.routes.js';
import tripRouter from './routes/trip.routes.js';
import passport from './config/passport.js';
import morgan from 'morgan';
import { logger } from './utils/logger.js';
import { sequelize } from './config/db.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());
app.use(passport.initialize());

const morganFormat =
  ':method :url :status :res[content-length] - :response-time ms';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logParts = message.split(' ');
        const status = parseInt(logParts[2], 10);
        if (status >= 500) {
          logger.error(message.trim());
        } else if (status >= 400) {
          logger.warn(message.trim());
        } else {
          logger.info(message.trim());
        }
      }
    }
  })
);

// Routes
app.get('/api/v1', (req, res) => {
  res.json({ message: 'Trip Planner API', version: '1.0.0' });
});

app.get('/api/v1/health', async (req, res) => {
  try {
    const dbStatus = await sequelize
      .authenticate()
      .then(() => 'UP')
      .catch(() => 'DOWN');
    const memory = process.memoryUsage();
    res.status(200).json({
      status: 'UP',
      service: 'Trip Planner API',
      uptime: process.uptime(),
      timestamp: new Date(),
      checks: {
        database: dbStatus,
        memory: {
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`
        },
        node: process.version
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      error: error.message
    });
  }
});

// Use Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/trips', tripRouter);

// Error Handling Middleware
app.use(errorHandler);

export default app;
