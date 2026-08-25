import mongoose from 'mongoose';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from './db.js';

import { MatchRequest } from './models/MatchRequest.js';
import { Request } from './models/Request.js';

const startCronJobs = () => {
  console.log('Starting automated cleanup cron jobs (15m pool lookups, 10m invite auto-expire)...');

  setInterval(async () => {
    try {
      const now = new Date();
      const poolCutoff = new Date(now.getTime() - 15 * 60 * 1000); // 15 mins ago
      const inviteCutoff = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago

      if (getIsMongoConnected()) {
        // 1. Delete all pool lookups older than 15 minutes
        const deletedRequests = await Request.deleteMany({ createdAt: { $lt: poolCutoff } });
        if (deletedRequests.deletedCount > 0) {
          console.log(`[Cron] Deleted ${deletedRequests.deletedCount} expired pool lookups (>15m)`);
        }

        // 2. Auto-decline pending invites older than 10 minutes
        const autoDeclined = await MatchRequest.updateMany(
          { status: 'pending', createdAt: { $lt: inviteCutoff } },
          { status: 'declined', declinedReason: 'expired_10m', declinedAt: now }
        );
        if (autoDeclined.modifiedCount > 0) {
          console.log(`[Cron] Auto-declined ${autoDeclined.modifiedCount} pending invites (>10m)`);
        }
      } else {
        const db = getFallbackDb();
        
        // 1. Delete lookups older than 15m
        const initialRequestsCount = (db.requests || []).length;
        db.requests = (db.requests || []).filter(req => new Date(req.createdAt) >= poolCutoff);

        // 2. Auto-decline invites older than 10m
        let modifiedInvites = 0;
        (db.matchRequests || []).forEach(m => {
          if (m.status === 'pending' && new Date(m.createdAt) < inviteCutoff) {
            m.status = 'declined';
            m.declinedReason = 'expired_10m';
            m.declinedAt = now.toISOString();
            modifiedInvites++;
          }
        });

        // 3. Clean chat messages older than 15 mins
        if (db.chatMessages) {
          db.chatMessages = db.chatMessages.filter(msg => new Date(msg.createdAt) >= poolCutoff);
        }

        if (initialRequestsCount - db.requests.length > 0 || modifiedInvites > 0) {
          saveFallbackDb();
        }
      }
    } catch (err) {
      console.error('[Cron Error] Failed to run automated cleanup:', err.message);
    }
  }, 30 * 1000); // 30-sec interval for responsive cleanup
};

export default startCronJobs;
