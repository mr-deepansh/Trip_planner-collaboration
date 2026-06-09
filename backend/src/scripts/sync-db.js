import 'dotenv/config';
import '../models/index.js';
import { connectDB, disconnectDB } from '../config/db.js';

process.env.ENABLE_SYNC = 'true';

try {
  await connectDB();
  console.log('Database sync completed successfully');
} catch (error) {
  console.error('Database sync failed:', error.message);
  process.exit(1);
} finally {
  await disconnectDB();
}
