import express from 'express';
import jwt from 'jsonwebtoken';
import { MatchRequest } from '../models/MatchRequest.js';
import { Request } from '../models/Request.js';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';
import { sendInviteReceivedEmail } from '../email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fortnite_teamup_super_secret_jwt_key_2026_production';

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

// Handler for sending match requests
async function handleSendMatchRequest(req, res) {
  try {
    const targetPostId = req.params.postId;
    const currentUserId = getAuthUserId(req);
    const { platform, rank, region, hasMic, langPrimary, note } = req.body || {};

    if (!currentUserId) {
      return res.status(401).json({ error: 'You must be logged in to send a request.' });
    }

    if (getIsMongoConnected()) {
      const sender = await User.findById(currentUserId);
      if (!sender) return res.status(404).json({ error: 'User not found' });

      // 1. Free Tier Rule: Max 2 Lifetime Free Requests (Combined Posts + Invites)
      if (!sender.isPremium) {
        const freeUsed = (sender.postsCount || 0) + (sender.invitesCount || 0);
        if (freeUsed >= 2) {
          return res.status(403).json({
            error: 'Free tier limit reached: You have used your 2 free requests. Upgrade to VIP Premium to send unlimited invites!',
            isFreeLimitReached: true,
            freeUsed,
            freeLimit: 2
          });
        }
      } else {
        // 2. Premium Tier Rule: 1 Outgoing Pending Invite at a time
        const pendingOut = await MatchRequest.findOne({ fromUserId: currentUserId, status: 'pending' });
        if (pendingOut) {
          return res.status(400).json({
            error: 'You already have a pending invite sent. You can only send 1 invite at a time. Please wait for the other player to respond before sending another.'
          });
        }
      }

      const targetPost = await Request.findById(targetPostId);
      if (!targetPost) return res.status(404).json({ error: 'Request no longer available.' });
      if (String(targetPost.userId) === String(currentUserId)) {
        return res.status(400).json({ error: 'You cannot request yourself.' });
      }

      const existing = await MatchRequest.findOne({ fromUserId: currentUserId, targetPostId, status: { $in: ['pending', 'accepted'] } });
      if (existing) return res.status(400).json({ error: 'You have already sent a request to this player.' });

      sender.invitesCount = (sender.invitesCount || 0) + 1;
      await sender.save();

      await MatchRequest.create({
        fromUserId: String(currentUserId),
        toUserId: String(targetPost.userId),
        targetPostId: String(targetPostId),
        status: 'pending',
        senderPlatform: platform || 'PC',
        senderRank: rank || 'Diamond',
        senderRegion: region || sender.region || 'NA-East',
        senderMic: hasMic === false || hasMic === 'No' ? 'No' : 'Yes',
        senderLang: langPrimary || sender.langPrimary || 'English',
        senderNote: note?.trim() || ''
      });

      // Send Email Notification to Target Post Owner
      const targetUser = await User.findById(targetPost.userId);
      if (targetUser && targetUser.email) {
        sendInviteReceivedEmail(
          targetUser.email,
          targetUser.username,
          sender.username,
          sender.epicTag,
          { region: targetPost.region, mainMode: targetPost.mainMode }
        ).catch(e => console.warn('Invite notification email error:', e));
      }

      return res.status(201).json({ success: true, message: 'Request sent!', invitesCount: sender.invitesCount });
    } else {
      const db = getFallbackDb();
      const sender = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      if (!sender) return res.status(404).json({ error: 'User not found' });

      // 1. Free Tier Rule: Max 2 Lifetime Free Requests (Combined Posts + Invites)
      if (!sender.isPremium) {
        const freeUsed = (sender.postsCount || 0) + (sender.invitesCount || 0);
        if (freeUsed >= 2) {
          return res.status(403).json({
            error: 'Free tier limit reached: You have used your 2 free requests. Upgrade to VIP Premium to send unlimited invites!',
            isFreeLimitReached: true,
            freeUsed,
            freeLimit: 2
          });
        }
      } else {
        // 2. Premium Tier Rule: 1 Outgoing Pending Invite at a time
        const pendingOut = (db.matchRequests || []).find(m => 
          (String(m.fromUserId) === String(sender.id) || String(m.fromUserId) === String(sender._id)) && 
          m.status === 'pending'
        );
        if (pendingOut) {
          return res.status(400).json({
            error: 'You already have a pending invite sent. You can only send 1 invite at a time. Please wait for the other player to respond before sending another.'
          });
        }
      }

      const targetPost = db.requests.find(r => String(r.id) === String(targetPostId) || String(r._id) === String(targetPostId));
      if (!targetPost) return res.status(404).json({ error: 'Request no longer available.' });
      if (String(targetPost.userId) === String(sender.id) || String(targetPost.userId) === String(sender._id)) {
        return res.status(400).json({ error: 'You cannot request yourself.' });
      }

      const existing = (db.matchRequests || []).find(m => 
        (String(m.fromUserId) === String(sender.id) || String(m.fromUserId) === String(sender._id)) && 
        String(m.targetPostId) === String(targetPostId) &&
        (m.status === 'pending' || m.status === 'accepted')
      );
      if (existing) return res.status(400).json({ error: 'You have already sent a request to this player.' });

      sender.invitesCount = (sender.invitesCount || 0) + 1;

      const newMatchReq = {
        id: `matchreq-${Date.now()}`,
        _id: `matchreq-${Date.now()}`,
        fromUserId: String(sender.id || sender._id),
        toUserId: String(targetPost.userId),
        targetPostId: String(targetPostId),
        status: 'pending',
        senderPlatform: platform || 'PC',
        senderRank: rank || 'Diamond',
        senderRegion: region || sender.region || 'NA-East',
        senderMic: hasMic === false || hasMic === 'No' ? 'No' : 'Yes',
        senderLang: langPrimary || sender.langPrimary || 'English',
        senderNote: note?.trim() || '',
        createdAt: new Date().toISOString()
      };

      db.matchRequests = db.matchRequests || [];
      db.matchRequests.push(newMatchReq);
      saveFallbackDb();

      // Send Email Notification to Target Post Owner
      const targetUser = db.users.find(u => String(u.id) === String(targetPost.userId) || String(u._id) === String(targetPost.userId));
      if (targetUser && targetUser.email) {
        sendInviteReceivedEmail(
          targetUser.email,
          targetUser.username,
          sender.username,
          sender.epicTag,
          { region: targetPost.region, mainMode: targetPost.mainMode }
        ).catch(e => console.warn('Invite notification email error:', e));
      }

      return res.status(201).json({ success: true, message: 'Request sent!', invitesCount: sender.invitesCount });
    }
  } catch (err) {
    console.error('Send match request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
}

// Support both URL patterns
router.post('/:postId/request', handleSendMatchRequest);
router.post('/request/:postId', handleSendMatchRequest);

router.get('/incoming', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      const incoming = await MatchRequest.find({ toUserId: currentUserId, status: 'pending' }).sort({ createdAt: 1 });
      const populated = await Promise.all(incoming.map(async (m) => {
        const sender = await User.findById(m.fromUserId);
        const post = await Request.findById(m.targetPostId);
        if (!sender) return null;

        return {
          id: m._id,
          fromUserId: m.fromUserId,
          senderName: sender.username,
          senderEpic: sender.epicTag,
          senderDiscord: sender.discordId,
          senderPlatform: m.senderPlatform || 'PC',
          senderRank: m.senderRank || 'Diamond',
          senderRegion: m.senderRegion || sender.region || 'NA-East',
          senderMic: m.senderMic || (sender.hasMic ? 'Yes' : 'No'),
          senderLang: m.senderLang || sender.langPrimary || 'English',
          senderNote: m.senderNote || '',
          postMainMode: post ? post.mainMode : 'Battle Royale',
          createdAt: m.createdAt
        };
      }));
      return res.json({ incoming: populated.filter(Boolean) });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      const rawIncoming = (db.matchRequests || []).filter(m => 
        userIds.includes(String(m.toUserId)) && m.status === 'pending'
      );
      rawIncoming.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // FIFO
      
      const populated = rawIncoming.map(m => {
        const sender = db.users.find(u => String(u.id) === String(m.fromUserId) || String(u._id) === String(m.fromUserId));
        const post = db.requests.find(r => String(r.id) === String(m.targetPostId) || String(r._id) === String(m.targetPostId));
        if (!sender) return null;

        return {
          id: m.id || m._id,
          fromUserId: m.fromUserId,
          senderName: sender.username,
          senderEpic: sender.epicTag,
          senderDiscord: sender.discordId,
          senderPlatform: m.senderPlatform || 'PC',
          senderRank: m.senderRank || 'Diamond',
          senderRegion: m.senderRegion || sender.region || 'NA-East',
          senderMic: m.senderMic || (sender.hasMic ? 'Yes' : 'No'),
          senderLang: m.senderLang || sender.langPrimary || 'English',
          senderNote: m.senderNote || '',
          postMainMode: post ? post.mainMode : 'Battle Royale',
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
      if (!matchReq) {
        return res.status(404).json({ error: 'Match request not found.' });
      }
      
      matchReq.status = 'accepted';
      matchReq.matchedAt = new Date();
      await matchReq.save();

      const sender = await User.findById(matchReq.fromUserId);
      // Remove BOTH receiver's post AND sender's earlier lookup from the pool
      await Request.deleteMany({ userId: { $in: [currentUserId, matchReq.fromUserId] } });
      
      await MatchRequest.updateMany(
        { toUserId: currentUserId, status: 'pending', _id: { $ne: matchId } },
        { status: 'declined' }
      );
      
      await MatchRequest.updateMany(
        { toUserId: matchReq.fromUserId, status: 'pending' },
        { status: 'declined' }
      );

      const matchedAt = matchReq.matchedAt;
      const expiresAt = new Date(new Date(matchedAt).getTime() + 15 * 60 * 1000).toISOString();

      return res.json({ 
        success: true, 
        message: `Match accepted!`,
        matchId: String(matchReq.id || matchReq._id),
        matchedAt,
        expiresAt,
        matchedPlayer: {
          username: sender?.username || 'Teammate',
          epicTag: sender?.epicTag || '',
          discordId: sender?.discordId || '',
          psnId: sender?.psnId || '',
          xboxId: sender?.xboxId || ''
        }
      });
    } else {
      const db = getFallbackDb();
      const matchReq = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (!matchReq) {
        return res.status(404).json({ error: 'Match request not found.' });
      }

      matchReq.status = 'accepted';
      matchReq.matchedAt = new Date().toISOString();
      const sender = db.users.find(u => String(u.id) === String(matchReq.fromUserId) || String(u._id) === String(matchReq.fromUserId));
      
      // Clean active posts for both receiver AND sender
      const removeIds = [String(currentUserId), String(matchReq.fromUserId)];
      if (sender) removeIds.push(String(sender.id), String(sender._id));

      db.requests = (db.requests || []).filter(r => !removeIds.includes(String(r.userId)));

      // Decline other pending requests for these users
      db.matchRequests.forEach(m => {
        if (removeIds.includes(String(m.toUserId)) && m.status === 'pending' && String(m.id) !== matchId && String(m._id) !== matchId) {
          m.status = 'declined';
        }
      });

      saveFallbackDb();

      const matchedAt = matchReq.matchedAt;
      const expiresAt = new Date(new Date(matchedAt).getTime() + 15 * 60 * 1000).toISOString();

      return res.json({ 
        success: true, 
        message: `Match accepted!`,
        matchId: String(matchReq.id || matchReq._id),
        matchedAt,
        expiresAt,
        matchedPlayer: {
          username: sender?.username || 'Teammate',
          epicTag: sender?.epicTag || '',
          discordId: sender?.discordId || '',
          psnId: sender?.psnId || '',
          xboxId: sender?.xboxId || ''
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

    if (getIsMongoConnected()) {
      const match = await MatchRequest.findOne({
        fromUserId: currentUserId,
        status: 'accepted'
      }).sort({ matchedAt: -1 });

      const declinedMatch = await MatchRequest.findOne({
        fromUserId: currentUserId,
        status: 'declined'
      }).sort({ createdAt: -1 });

      let hasDeclined = false;
      let declinedPostTitle = 'Teammate Request';
      if (declinedMatch) {
        hasDeclined = true;
        const targetPost = await Request.findById(declinedMatch.targetPostId);
        declinedPostTitle = targetPost ? `${targetPost.gamertag} (${targetPost.mainMode})` : 'Teammate Request';
      }

      if (!match) {
        return res.json({ hasAcceptedMatch: false, hasDeclinedMatch: hasDeclined, declinedPostTitle });
      }

      const receiver = await User.findById(match.toUserId);
      const matchedAt = match.matchedAt || match.createdAt;
      const expiresAt = new Date(new Date(matchedAt).getTime() + 15 * 60 * 1000).toISOString();

      return res.json({
        hasAcceptedMatch: true,
        hasDeclinedMatch: hasDeclined,
        declinedPostTitle,
        matchId: String(match.id || match._id),
        matchedAt,
        expiresAt,
        matchedPlayer: {
          username: receiver?.username || 'Teammate',
          epicTag: receiver?.epicTag || '',
          discordId: receiver?.discordId || '',
          psnId: receiver?.psnId || '',
          xboxId: receiver?.xboxId || ''
        }
      });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      const match = (db.matchRequests || []).find(m => 
        userIds.includes(String(m.fromUserId)) && m.status === 'accepted'
      );

      const declinedMatch = (db.matchRequests || []).find(m => 
        userIds.includes(String(m.fromUserId)) && m.status === 'declined'
      );

      let hasDeclined = false;
      let declinedPostTitle = 'Teammate Request';
      if (declinedMatch) {
        hasDeclined = true;
        const targetPost = (db.requests || []).find(r => String(r.id) === String(declinedMatch.targetPostId) || String(r._id) === String(declinedMatch.targetPostId));
        declinedPostTitle = targetPost ? `${targetPost.gamertag} (${targetPost.mainMode})` : 'Teammate Request';
      }

      if (!match) {
        return res.json({ hasAcceptedMatch: false, hasDeclinedMatch: hasDeclined, declinedPostTitle });
      }

      const receiver = db.users.find(u => String(u.id) === String(match.toUserId) || String(u._id) === String(match.toUserId));
      const matchedAt = match.matchedAt || match.createdAt;
      const expiresAt = new Date(new Date(matchedAt).getTime() + 15 * 60 * 1000).toISOString();

      return res.json({
        hasAcceptedMatch: true,
        hasDeclinedMatch: hasDeclined,
        declinedPostTitle,
        matchId: String(match.id || match._id),
        matchedAt,
        expiresAt,
        matchedPlayer: {
          username: receiver?.username || 'Teammate',
          epicTag: receiver?.epicTag || '',
          discordId: receiver?.discordId || '',
          psnId: receiver?.psnId || '',
          xboxId: receiver?.xboxId || ''
        }
      });
    }
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
      await MatchRequest.findByIdAndUpdate(matchId, { status: 'declined' });
    } else {
      const db = getFallbackDb();
      const matchReq = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (matchReq) {
        matchReq.status = 'declined';
        saveFallbackDb();
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline' });
  }
});

router.post('/dismiss-declined', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      await MatchRequest.updateMany(
        { fromUserId: currentUserId, status: 'declined' },
        { status: 'acknowledged' }
      );
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      (db.matchRequests || []).forEach(m => {
        if (userIds.includes(String(m.fromUserId)) && m.status === 'declined') {
          m.status = 'acknowledged';
        }
      });
      saveFallbackDb();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss declined notification' });
  }
});

router.post('/dismiss', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      await MatchRequest.updateMany(
        { $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }], status: 'accepted' },
        { status: 'acknowledged' }
      );
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      (db.matchRequests || []).forEach(m => {
        if ((userIds.includes(String(m.fromUserId)) || userIds.includes(String(m.toUserId))) && m.status === 'accepted') {
          m.status = 'acknowledged';
        }
      });
      saveFallbackDb();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss match' });
  }
});

export default router;
