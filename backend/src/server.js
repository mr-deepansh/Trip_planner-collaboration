import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import './models/index.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const PORT = process.env.PORT;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            logger.info(`Server is running at port : ${PORT}`);
        });
    })
    .catch((err) => {
        logger.error(`PostgreSQL connection failed! ${err}`);
    });
