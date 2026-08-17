import express from 'express';
import jwt from 'jsonwebtoken';
import { Request } from '../models/Request.js';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';
import { sendMatchNotificationEmail } from '../email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'teamup_jwt_secret_2026_super_secure';

function getAuthUserId(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.id;
    }
  } catch {}
  return null;
}

router.get('/', async (req, res) => {
  try {
    if (getIsMongoConnected()) {
      const requests = await Request.find({ isHidden: { $ne: true } }).sort({ createdAt: -1 }).limit(100);
      return res.json({ requests });
    } else {
      const db = getFallbackDb();
      const requests = [...db.requests]
        .filter(r => !r.isHidden)
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

      if (!user.isPremium) {
        if (user.lastPostDate) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (new Date(user.lastPostDate) > sevenDaysAgo) {
            const nextAvailable = new Date(new Date(user.lastPostDate).getTime() + 7 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((nextAvailable - Date.now()) / (1000 * 60 * 60 * 24));
            return res.status(403).json({
              error: `Free tier accounts can only post once every 7 days. (${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining). Upgrade to Premium for unlimited broadcasts!`,
              isCooldown: true
            });
          }
        }
      }

      user.lastPostDate = new Date();
      await user.save();

      const activePosts = await Request.find({ userId });
      if (user.isPremium) {
        if (activePosts.length >= 2) {
          return res.status(400).json({ error: 'You can only have 2 active teammate requests at a time. Please wait for them to expire or be accepted.' });
        }
        
        if (activePosts.length === 1) {
          const existing = activePosts[0];
          const isDuplicate = existing.mainMode === mainMode && 
                              (mainMode === 'Creative' ? existing.creativeType === creativeType : existing.teamSize === teamSize) &&
                              (mainMode !== 'Creative' ? existing.buildType === buildType : true);
          if (isDuplicate) {
            return res.status(400).json({ error: 'Your new request must be different from your existing active request (e.g. different mode, team size, or build type).' });
          }
        }
      } else {
        await Request.deleteMany({ userId });
      }

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

      return res.status(201).json({ request: newRequest });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => u.id === userId || u._id === userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      userAge = user.age || 18;
      isUserPremium = Boolean(user.isPremium);

      if (!user.isPremium) {
        if (user.lastPostDate) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const lastPost = new Date(user.lastPostDate);
          if (lastPost > sevenDaysAgo) {
            const nextAvailable = new Date(lastPost.getTime() + 7 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((nextAvailable - Date.now()) / (1000 * 60 * 60 * 24));
            return res.status(403).json({
              error: `Free tier accounts can only post once every 7 days. (${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining). Upgrade to Premium for unlimited broadcasts!`,
              isCooldown: true
            });
          }
        }
      }

      user.lastPostDate = new Date().toISOString();

      const activePosts = db.requests.filter(r => r.userId === userId);
      if (user.isPremium) {
        if (activePosts.length >= 2) {
          return res.status(400).json({ error: 'You can only have 2 active teammate requests at a time. Please wait for them to expire or be accepted.' });
        }
        
        if (activePosts.length === 1) {
          const existing = activePosts[0];
          const isDuplicate = existing.mainMode === mainMode && 
                              (mainMode === 'Creative' ? existing.creativeType === creativeType : existing.teamSize === teamSize) &&
                              (mainMode !== 'Creative' ? existing.buildType === buildType : true);
          if (isDuplicate) {
            return res.status(400).json({ error: 'Your new request must be different from your existing active request (e.g. different mode, team size, or build type).' });
          }
        }
      } else {
        db.requests = db.requests.filter(r => r.userId !== userId);
      }

      const newRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        _id: `req-${Date.now()}`,
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
        note: note?.trim() || '',
        createdAt: new Date().toISOString()
      };

      db.requests.unshift(newRequest);
      saveFallbackDb();

      return res.status(201).json({ request: newRequest });
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
