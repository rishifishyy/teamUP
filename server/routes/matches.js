import express from 'express';
import jwt from 'jsonwebtoken';
import { Request } from '../models/Request.js';
import { User } from '../models/User.js';
import { MatchRequest } from '../models/MatchRequest.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';

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

async function removeUserActivePost(userId, isMongo) {
  if (isMongo) {
    await Request.deleteMany({ userId });
  } else {
    const db = getFallbackDb();
    db.requests = db.requests.filter(r => String(r.userId) !== String(userId));
    saveFallbackDb();
  }
}

router.post('/:postId/request', async (req, res) => {
  try {
    const targetPostId = req.params.postId;
    const currentUserId = getAuthUserId(req);

    if (!currentUserId) {
      return res.status(401).json({ error: 'You must be logged in to send a request.' });
    }

    if (getIsMongoConnected()) {
      const targetPost = await Request.findById(targetPostId);
      if (!targetPost) return res.status(404).json({ error: 'Request no longer available.' });
      if (String(targetPost.userId) === String(currentUserId)) {
        return res.status(400).json({ error: 'You cannot request yourself.' });
      }

      const existing = await MatchRequest.findOne({ fromUserId: currentUserId, targetPostId });
      if (existing) return res.status(400).json({ error: 'You have already sent a request.' });

      const newMatchReq = await MatchRequest.create({
        fromUserId: currentUserId,
        toUserId: targetPost.userId,
        targetPostId,
        status: 'pending'
      });

      return res.status(201).json({ success: true, message: 'Request sent!' });
    } else {
      const db = getFallbackDb();
      const targetPost = db.requests.find(r => r.id === targetPostId || r._id === targetPostId);
      if (!targetPost) return res.status(404).json({ error: 'Request no longer available.' });
      if (String(targetPost.userId) === String(currentUserId)) return res.status(400).json({ error: 'You cannot request yourself.' });

      const existing = (db.matchRequests || []).find(m => String(m.fromUserId) === String(currentUserId) && String(m.targetPostId) === String(targetPostId));
      if (existing) return res.status(400).json({ error: 'You have already sent a request.' });

      const newMatchReq = {
        id: `matchreq-${Date.now()}`,
        _id: `matchreq-${Date.now()}`,
        fromUserId: currentUserId,
        toUserId: targetPost.userId,
        targetPostId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      db.matchRequests = db.matchRequests || [];
      db.matchRequests.push(newMatchReq);
      saveFallbackDb();

      return res.status(201).json({ success: true, message: 'Request sent!' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

router.get('/incoming', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    let incoming = [];
    if (getIsMongoConnected()) {
      incoming = await MatchRequest.find({ toUserId: currentUserId, status: 'pending' }).sort({ createdAt: 1 });
      const populated = await Promise.all(incoming.map(async (m) => {
        const sender = await User.findById(m.fromUserId);
        const post = await Request.findById(m.targetPostId);
        if (!sender || !post) return null;

        const senderPost = await Request.findOne({ userId: m.fromUserId }).sort({ createdAt: -1 });

        return {
          id: m._id,
          fromUserId: m.fromUserId,
          senderName: sender.username,
          senderEpic: sender.epicTag,
          senderDiscord: sender.discordId,
          senderPlatform: senderPost ? senderPost.platform : 'Unknown',
          senderRegion: senderPost ? senderPost.region : 'Unknown',
          senderMode: senderPost ? (senderPost.mainMode === 'Creative' ? senderPost.creativeType : `${senderPost.mainMode} (${senderPost.buildType})`) : 'Unknown',
          senderTeamSize: senderPost ? senderPost.teamSize : 'Unknown',
          senderMic: senderPost ? (senderPost.hasMic ? 'Yes' : 'No') : 'Unknown',
          senderNote: senderPost ? senderPost.note : '',
          postMainMode: post.mainMode,
          createdAt: m.createdAt
        };
      }));
      return res.json({ incoming: populated.filter(Boolean) });
    } else {
      const db = getFallbackDb();
      const rawIncoming = (db.matchRequests || []).filter(m => String(m.toUserId) === String(currentUserId) && m.status === 'pending');
      rawIncoming.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // FIFO
      
      const populated = rawIncoming.map(m => {
        const sender = db.users.find(u => String(u.id) === String(m.fromUserId) || String(u._id) === String(m.fromUserId));
        const post = db.requests.find(r => String(r.id) === String(m.targetPostId) || String(r._id) === String(m.targetPostId));
        if (!sender || !post) return null;

        const senderPosts = db.requests.filter(r => String(r.userId) === String(m.fromUserId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const senderPost = senderPosts.length > 0 ? senderPosts[0] : null;

        return {
          id: m.id || m._id,
          fromUserId: m.fromUserId,
          senderName: sender.username,
          senderEpic: sender.epicTag,
          senderDiscord: sender.discordId,
          senderPlatform: senderPost ? senderPost.platform : 'Unknown',
          senderRegion: senderPost ? senderPost.region : 'Unknown',
          senderMode: senderPost ? (senderPost.mainMode === 'Creative' ? senderPost.creativeType : `${senderPost.mainMode} (${senderPost.buildType})`) : 'Unknown',
          senderTeamSize: senderPost ? senderPost.teamSize : 'Unknown',
          senderMic: senderPost ? (senderPost.hasMic ? 'Yes' : 'No') : 'Unknown',
          senderNote: senderPost ? senderPost.note : '',
          postMainMode: post.mainMode,
          createdAt: m.createdAt
        };
      }).filter(Boolean);

      return res.json({ incoming: populated });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

router.post('/:matchId/accept', async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      const matchReq = await MatchRequest.findById(matchId);
      if (!matchReq || String(matchReq.toUserId) !== String(currentUserId)) {
        return res.status(404).json({ error: 'Match request not found.' });
      }
      
      matchReq.status = 'accepted';
      await matchReq.save();

      const sender = await User.findById(matchReq.fromUserId);
      
      await removeUserActivePost(currentUserId, true);
      await removeUserActivePost(matchReq.fromUserId, true);

      await MatchRequest.updateMany(
        { toUserId: currentUserId, status: 'pending', _id: { $ne: matchId } },
        { status: 'declined' }
      );
      
      await MatchRequest.updateMany(
        { toUserId: matchReq.fromUserId, status: 'pending' },
        { status: 'declined' }
      );

      return res.json({ 
        success: true, 
        message: `Match accepted!`,
        matchedPlayer: {
          username: sender.username,
          epicTag: sender.epicTag,
          discordId: sender.discordId,
          psnId: sender.psnId,
          xboxId: sender.xboxId
        }
      });
    } else {
      const db = getFallbackDb();
      const matchReq = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (!matchReq || String(matchReq.toUserId) !== String(currentUserId)) {
        return res.status(404).json({ error: 'Match request not found.' });
      }

      matchReq.status = 'accepted';
      const sender = db.users.find(u => String(u.id) === String(matchReq.fromUserId) || String(u._id) === String(matchReq.fromUserId));
      
      await removeUserActivePost(currentUserId, false);
      await removeUserActivePost(matchReq.fromUserId, false);

      db.matchRequests.forEach(m => {
        if (String(m.toUserId) === String(currentUserId) && m.status === 'pending' && (String(m.id) !== matchId && String(m._id) !== matchId)) {
          m.status = 'declined';
        }
        if (String(m.toUserId) === String(matchReq.fromUserId) && m.status === 'pending') {
          m.status = 'declined';
        }
      });

      saveFallbackDb();

      return res.json({ 
        success: true, 
        matchedPlayer: {
          username: sender.username,
          epicTag: sender.epicTag,
          discordId: sender.discordId,
          psnId: sender.psnId,
          xboxId: sender.xboxId
        }
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept' });
  }
});

router.get('/accepted', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    let acceptedMatch = null;
    let matchedUser = null;

    if (getIsMongoConnected()) {
      acceptedMatch = await MatchRequest.findOne({ fromUserId: currentUserId, status: 'accepted' });
      if (acceptedMatch) {
        matchedUser = await User.findById(acceptedMatch.toUserId);
        acceptedMatch.status = 'acknowledged';
        await acceptedMatch.save();
      }
    } else {
      const db = getFallbackDb();
      acceptedMatch = (db.matchRequests || []).find(m => String(m.fromUserId) === String(currentUserId) && m.status === 'accepted');
      if (acceptedMatch) {
        matchedUser = db.users.find(u => String(u.id) === String(acceptedMatch.toUserId) || String(u._id) === String(acceptedMatch.toUserId));
        acceptedMatch.status = 'acknowledged';
        saveFallbackDb();
      }
    }

    if (acceptedMatch && matchedUser) {
      return res.json({
        hasAcceptedMatch: true,
        matchedPlayer: {
          username: matchedUser.username,
          epicTag: matchedUser.epicTag,
          discordId: matchedUser.discordId,
          psnId: matchedUser.psnId,
          xboxId: matchedUser.xboxId
        }
      });
    }

    return res.json({ hasAcceptedMatch: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accepted matches' });
  }
});

router.post('/:matchId/decline', async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      const matchReq = await MatchRequest.findById(matchId);
      if (matchReq && String(matchReq.toUserId) === String(currentUserId)) {
        matchReq.status = 'declined';
        await matchReq.save();
      }
    } else {
      const db = getFallbackDb();
      const matchReq = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (matchReq && String(matchReq.toUserId) === String(currentUserId)) {
        matchReq.status = 'declined';
        saveFallbackDb();
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline' });
  }
});

export default router;
