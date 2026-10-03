import { User } from './models/User.js';
import { getIsMongoConnected, saveFallbackDb } from './db.js';

export const FREE_PASS_LIMIT = 2;
export const FREE_PASS_REFILL_MS = 14 * 24 * 60 * 60 * 1000;
export const FREE_PASS_RESET = { postsCount: 0, invitesCount: 0, freePassesRefillAt: null };
const usedExpression = { $add: [{ $ifNull: ['$postsCount', 0] }, { $ifNull: ['$invitesCount', 0] }] };
export const freePassesUsed = user => (user?.postsCount || 0) + (user?.invitesCount || 0);

function syncUsage(user, updated) {
  for (const key of Object.keys(FREE_PASS_RESET)) {
    user[key] = updated[key] ?? FREE_PASS_RESET[key];
    // Updates already persisted atomically; later profile saves must not overwrite them.
    user.unmarkModified?.(key);
  }
}

export async function refreshFreePasses(user, now = new Date()) {
  if (!user || freePassesUsed(user) < FREE_PASS_LIMIT) return false;
  const refillAt = user.freePassesRefillAt && new Date(user.freePassesRefillAt);
  const expired = refillAt && refillAt <= now;
  if (refillAt && !expired) return false;
  const update = expired ? FREE_PASS_RESET : { freePassesRefillAt: new Date(now.getTime() + FREE_PASS_REFILL_MS) };
  if (getIsMongoConnected()) {
    const filter = expired
      ? { _id: user._id, freePassesRefillAt: { $lte: now } }
      : { _id: user._id, freePassesRefillAt: null, $expr: { $gte: [usedExpression, FREE_PASS_LIMIT] } };
    const updated = await User.findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' }).select('postsCount invitesCount freePassesRefillAt');
    const current = updated || await User.findById(user._id).select('postsCount invitesCount freePassesRefillAt');
    if (current) syncUsage(user, current);
    return Boolean(updated);
  }
  Object.assign(user, update);
  saveFallbackDb();
  return true;
}

export function freePassLimitError(user) {
  return {
    error: 'Your 2 free match passes are used. Both passes refill 14 days after the second successful match. You can also upgrade to VIP for unlimited matching.',
    isFreeLimitReached: true,
    freeUsed: freePassesUsed(user),
    freeLimit: FREE_PASS_LIMIT,
    freePassesRefillAt: user.freePassesRefillAt || null
  };
}

export async function consumeFreePass(user, counter, now = new Date()) {
  if (!['postsCount', 'invitesCount'].includes(counter)) throw new Error('Invalid free-pass counter.');
  await refreshFreePasses(user, now);
  if (user.isPremium) return { allowed: true, charged: false };
  if (getIsMongoConnected()) {
    const updated = await User.findOneAndUpdate(
      { _id: user._id, $expr: { $lt: [usedExpression, FREE_PASS_LIMIT] } },
      [{ $set: {
        [counter]: { $add: [{ $ifNull: [`$${counter}`, 0] }, 1] },
        freePassesRefillAt: { $cond: [
          { $gte: [{ $add: [usedExpression, 1] }, FREE_PASS_LIMIT] },
          new Date(now.getTime() + FREE_PASS_REFILL_MS), null
        ] }
      } }], { returnDocument: 'after', updatePipeline: true }
    ).select('postsCount invitesCount freePassesRefillAt');
    if (!updated) return { allowed: false, charged: false };
    syncUsage(user, updated);
  } else {
    if (freePassesUsed(user) >= FREE_PASS_LIMIT) return { allowed: false, charged: false };
    user[counter] = (user[counter] || 0) + 1;
    user.freePassesRefillAt = freePassesUsed(user) >= FREE_PASS_LIMIT ? new Date(now.getTime() + FREE_PASS_REFILL_MS).toISOString() : null;
    saveFallbackDb();
  }
  return { allowed: true, charged: true };
}

export async function refundFreePass(user, counter) {
  if (getIsMongoConnected()) {
    const updated = await User.findOneAndUpdate({ _id: user._id, [counter]: { $gt: 0 } },
      { $inc: { [counter]: -1 }, $set: { freePassesRefillAt: null } }, { returnDocument: 'after' }
    ).select('postsCount invitesCount freePassesRefillAt');
    if (updated) syncUsage(user, updated);
  } else {
    user[counter] = Math.max(0, (user[counter] || 0) - 1);
    user.freePassesRefillAt = null;
    saveFallbackDb();
  }
}
