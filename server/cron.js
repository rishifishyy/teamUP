import mongoose from 'mongoose';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from './db.js';

import { Request } from './models/Request.js';

const startCronJobs = () => {
  console.log('Starting automated cleanup cron jobs...');

  setInterval(async () => {
    try {
      const now = new Date();
      const freeCutoff = new Date(now.getTime() - 15 * 60 * 1000); // 15 mins ago
      const premiumCutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 mins ago

      if (getIsMongoConnected()) {
        const result = await Request.deleteMany({
          $or: [
            { isPremium: false, createdAt: { $lt: freeCutoff } },
            { isPremium: true, createdAt: { $lt: premiumCutoff } }
          ]
        });
        if (result.deletedCount > 0) {
          console.log(`[Cron] Deleted ${result.deletedCount} expired requests from MongoDB`);
        }
      } else {
        const db = getFallbackDb();
        const initialCount = db.requests.length;

        db.requests = db.requests.filter(req => {
          const createdAt = new Date(req.createdAt);
          if (req.isPremium && createdAt < premiumCutoff) return false;
          if (!req.isPremium && createdAt < freeCutoff) return false;
          return true;
        });

        // Also clean chat messages older than 15 mins
        if (db.chatMessages) {
          db.chatMessages = db.chatMessages.filter(msg => {
            return new Date(msg.createdAt) >= freeCutoff;
          });
        }

        const deletedCount = initialCount - db.requests.length;
        if (deletedCount > 0) {
          saveFallbackDb();
          console.log(`[Cron] Deleted ${deletedCount} expired requests from Fallback JSON DB`);
        }
      }
    } catch (err) {
      console.error('[Cron Error] Failed to run automated cleanup:', err.message);
    }
  }, 60 * 1000); // 1 min interval
};

export default startCronJobs;
