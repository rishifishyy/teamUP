import express from 'express';
import jwt from 'jsonwebtoken';
import { Request } from '../models/Request.js';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fortnite_teamup_super_secret_jwt_key_2026_production';

function getAuthDecoded(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      return jwt.verify(token, JWT_SECRET);
    }
  } catch {}
  return null;
}

function getAuthUserId(req) {
  const decoded = getAuthDecoded(req);
  return decoded?.id || null;
}

function findFallbackUser(db, decodedOrId) {
  if (!decodedOrId) return null;
  const id = typeof decodedOrId === 'object' ? decodedOrId.id : decodedOrId;
  const username = typeof decodedOrId === 'object' ? decodedOrId.username : null;
  const email = typeof decodedOrId === 'object' ? decodedOrId.email : null;

  return (db.users || []).find(u => 
    (id && (String(u.id) === String(id) || String(u._id) === String(id))) ||
    (username && u.username && u.username.toLowerCase() === String(username).toLowerCase()) ||
    (email && u.email && u.email.toLowerCase() === String(email).toLowerCase())
  );
}

router.get('/', async (req, res) => {
  try {
    const poolCutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes max lifetime

    if (getIsMongoConnected()) {
      const requests = await Request.find({ 
        isHidden: { $ne: true },
        createdAt: { $gte: poolCutoff }
      }).sort({ createdAt: -1 }).limit(100);

      return res.json({ requests });
    } else {
      const db = getFallbackDb();
      const requests = [...(db.requests || [])]
        .filter(r => !r.isHidden && new Date(r.createdAt) >= poolCutoff)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.json({ requests });
    }
  } catch (err) {
    console.error('Fetch requests error:', err);
    res.status(500).json({ error: 'Failed to fetch teammate requests.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to post a request.' });
    }
    const {
      gamertag,
      epicTag,
      psnId,
      xboxId,
      discordId,
      region,
      mainMode,
      buildType,
      creativeType,
      teamSize,
      platform,
      langPrimary,
      langSecondary,
      hasMic,
      rank,
      note,
      isHidden
    } = req.body;

    if (!gamertag || !region || !mainMode || !teamSize || !platform) {
      return res.status(400).json({ error: 'Please provide all required request fields.' });
    }

    let userAge = 18;
    let isUserPremium = false;
    
    if (getIsMongoConnected()) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      userAge = user.age || 18;
      isUserPremium = Boolean(user.isPremium);

      // 1. Free Tier Rule: Max 2 Lifetime Free Matched Passes
      if (!isUserPremium) {
        const freeUsed = (user.postsCount || 0) + (user.invitesCount || 0);
        if (freeUsed >= 2) {
          return res.status(403).json({
            error: 'Free tier limit reached: You have used your 2 free match passes. Upgrade to VIP Premium for unlimited matching in the pool!',
            isFreeLimitReached: true,
            freeUsed,
            freeLimit: 2
          });
        }
      }

      // 1 Active Lookup in the pool at a time (delete any previous lookup by this user)
      await Request.deleteMany({ userId });

      user.lastPostDate = new Date();
      await user.save();

      const newRequest = await Request.create({
        userId,
        username: user.username,
        gamertag: gamertag.trim(),
        epicTag: (epicTag || gamertag).trim(),
        psnId: psnId?.trim() || '',
        xboxId: xboxId?.trim() || '',
        discordId: discordId?.trim() || '',
        region,
        mainMode,
        buildType: mainMode !== 'Creative' ? buildType : undefined,
        creativeType: mainMode === 'Creative' ? creativeType : undefined,
        teamSize,
        platform,
        langPrimary: langPrimary || 'English',
        langSecondary: langSecondary || 'None',
        hasMic: Boolean(hasMic),
        rank: rank || 'Diamond',
        userAge,
        isPremium: isUserPremium,
        note: note?.trim() || ''
      });

      return res.status(201).json({ request: newRequest, postsCount: user.postsCount || 0 });
    } else {
      const db = getFallbackDb();
      const user = findFallbackUser(db, getAuthDecoded(req) || userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const realUserId = String(user.id || user._id);
      userAge = user.age || 18;
      isUserPremium = Boolean(user.isPremium);

      // 1. Free Tier Rule: Max 2 Lifetime Free Matched Passes
      if (!isUserPremium) {
        const freeUsed = (user.postsCount || 0) + (user.invitesCount || 0);
        if (freeUsed >= 2) {
          return res.status(403).json({
            error: 'Free tier limit reached: You have used your 2 free match passes. Upgrade to VIP Premium for unlimited matching in the pool!',
            isFreeLimitReached: true,
            freeUsed,
            freeLimit: 2
          });
        }
      }

      // 1 Active Lookup in the pool at a time (clean previous)
      db.requests = (db.requests || []).filter(r => String(r.userId) !== realUserId);

      user.lastPostDate = new Date().toISOString();

      const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newRequest = {
        id: reqId,
        _id: reqId,
        userId: realUserId,
        username: user.username,
        gamertag: gamertag.trim(),
        epicTag: (epicTag || gamertag).trim(),
        psnId: psnId?.trim() || '',
        xboxId: xboxId?.trim() || '',
        discordId: discordId?.trim() || '',
        region,
        mainMode,
        buildType: mainMode !== 'Creative' ? buildType : undefined,
        creativeType: mainMode === 'Creative' ? creativeType : undefined,
        teamSize,
        platform,
        langPrimary: langPrimary || 'English',
        langSecondary: langSecondary || 'None',
        hasMic: Boolean(hasMic),
        rank: rank || 'Diamond',
        userAge,
        isPremium: isUserPremium,
        note: note?.trim() || '',
        createdAt: new Date().toISOString()
      };

      db.requests = db.requests || [];
      db.requests.unshift(newRequest);
      saveFallbackDb(db);

      return res.status(201).json({ request: newRequest, postsCount: user.postsCount || 0 });
    }
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: err.message || 'Failed to create teammate request.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const userId = getAuthUserId(req);

    if (getIsMongoConnected()) {
      const query = { _id: id };
      if (userId) query.userId = userId;

      const deleted = await Request.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ error: 'Request not found or unauthorized.' });
      }
      return res.json({ success: true, message: 'Request removed.' });
    } else {
      const db = getFallbackDb();
      const idx = db.requests.findIndex(r => r.id === id || r._id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Request not found.' });
      }

      db.requests.splice(idx, 1);
      saveFallbackDb();
      return res.json({ success: true, message: 'Request removed.' });
    }
  } catch (err) {
    console.error('Delete request error:', err);
    res.status(500).json({ error: 'Failed to delete request.' });
  }
});

export default router;
