import express from 'express';
import jwt from 'jsonwebtoken';
import { MatchRequest } from '../models/MatchRequest.js';
import { Request } from '../models/Request.js';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';
import { sendInviteReceivedEmail, sendInviteAcceptedEmail } from '../email.js';

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
      const sender = findFallbackUser(db, getAuthDecoded(req) || currentUserId);
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
// Support both URL patterns
router.post('/:postId/request', handleSendMatchRequest);
router.post('/request/:postId', handleSendMatchRequest);

// Handler for sending match requests
async function handleSendMatchRequest(req, res) {
  try {
    const targetPostId = req.params.postId;
    const currentUserId = getAuthUserId(req);
    const { platform, rank, region, hasMic, langPrimary, note } = req.body || {};

    if (!currentUserId) {
      return res.status(401).json({ error: 'You must be logged in to send a request.' });
    }

    const inviteCutoff = new Date(Date.now() - 10 * 60 * 1000);

    if (getIsMongoConnected()) {
      const sender = await User.findById(currentUserId);
      if (!sender) return res.status(404).json({ error: 'User not found' });

      // 1. Free Tier Rule: Max 2 Lifetime Free Matched Passes
      if (!sender.isPremium) {
        const freeUsed = (sender.postsCount || 0) + (sender.invitesCount || 0);
        if (freeUsed >= 2) {
          return res.status(403).json({
            error: 'Free tier limit reached: You have used your 2 free match passes. Upgrade to VIP Premium to send unlimited invites!',
            isFreeLimitReached: true,
            freeUsed,
            freeLimit: 2
          });
        }
      }

      // 2. Auto-expire any previous stale outgoing invites older than 10 mins
      await MatchRequest.updateMany(
        { fromUserId: currentUserId, status: 'pending', createdAt: { $lt: inviteCutoff } },
        { status: 'declined', declinedReason: 'expired_10m', declinedAt: new Date() }
      );

      // Max 1 Active Outgoing Pending Invite at a time
      const pendingOut = await MatchRequest.findOne({ fromUserId: currentUserId, status: 'pending' });
      if (pendingOut) {
        return res.status(400).json({
          error: 'You already have a pending invite sent. You can only send 1 invite at a time. Please wait for the other player to respond or 10 mins to expire.'
        });
      }

      const targetPost = await Request.findById(targetPostId);
      if (!targetPost) return res.status(404).json({ error: 'Request no longer available.' });
      if (String(targetPost.userId) === String(currentUserId)) {
        return res.status(400).json({ error: 'You cannot request yourself.' });
      }

      const existing = await MatchRequest.findOne({ fromUserId: currentUserId, targetPostId, status: { $in: ['pending', 'accepted'] } });
      if (existing) return res.status(400).json({ error: 'You have already sent a request to this player.' });

      // Note: Do NOT increment invitesCount yet! Only increment upon match acceptance.

      const newMatch = await MatchRequest.create({
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

      return res.status(201).json({ success: true, message: 'Request sent! Waiting for response (expires in 10m).', invitesCount: sender.invitesCount || 0 });
    } else {
      const db = getFallbackDb();
      const sender = findFallbackUser(db, getAuthDecoded(req) || currentUserId);
      if (!sender) return res.status(404).json({ error: 'User not found' });

      // 1. Free Tier Rule: Max 2 Lifetime Free Matched Passes
      if (!sender.isPremium) {
        const freeUsed = (sender.postsCount || 0) + (sender.invitesCount || 0);
        if (freeUsed >= 2) {
          return res.status(403).json({
            error: 'Free tier limit reached: You have used your 2 free match passes. Upgrade to VIP Premium to send unlimited invites!',
            isFreeLimitReached: true,
            freeUsed,
            freeLimit: 2
          });
        }
      }

      // Auto-expire stale invites older than 10 mins
      (db.matchRequests || []).forEach(m => {
        if (String(m.fromUserId) === String(sender.id || sender._id) && m.status === 'pending' && new Date(m.createdAt) < inviteCutoff) {
          m.status = 'declined';
          m.declinedReason = 'expired_10m';
          m.declinedAt = new Date().toISOString();
        }
      });

      // Max 1 Active Outgoing Pending Invite at a time
      const pendingOut = (db.matchRequests || []).find(m => 
        (String(m.fromUserId) === String(sender.id) || String(m.fromUserId) === String(sender._id)) && 
        m.status === 'pending'
      );
      if (pendingOut) {
        return res.status(400).json({
          error: 'You already have a pending invite sent. You can only send 1 invite at a time. Please wait for the other player to respond or 10 mins to expire.'
        });
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

      return res.status(201).json({ success: true, message: 'Request sent! Waiting for response (expires in 10m).', invitesCount: sender.invitesCount || 0 });
    }
  } catch (err) {
    console.error('Send match request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
}

// 1. Get Incoming Invites
router.get('/incoming', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const inviteCutoff = new Date(Date.now() - 10 * 60 * 1000);

    if (getIsMongoConnected()) {
      // Auto-expire pending invites older than 10 mins
      await MatchRequest.updateMany(
        { toUserId: currentUserId, status: 'pending', createdAt: { $lt: inviteCutoff } },
        { status: 'declined', declinedReason: 'expired_10m', declinedAt: new Date() }
      );

      const incoming = await MatchRequest.find({ 
        toUserId: currentUserId, 
        status: 'pending',
        createdAt: { $gte: inviteCutoff }
      }).sort({ createdAt: -1 });

      const populated = await Promise.all(incoming.map(async (m) => {
        const sender = await User.findById(m.fromUserId);
        const post = await Request.findById(m.targetPostId);
        if (!sender) return null;

        const timeRemainingMs = Math.max(0, 10 * 60 * 1000 - (Date.now() - new Date(m.createdAt).getTime()));

        return {
          id: String(m._id),
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
          createdAt: m.createdAt,
          timeRemainingSeconds: Math.floor(timeRemainingMs / 1000)
        };
      }));

      return res.json({ incoming: populated.filter(Boolean) });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      // Auto-expire invites older than 10 mins
      (db.matchRequests || []).forEach(m => {
        if (userIds.includes(String(m.toUserId)) && m.status === 'pending' && new Date(m.createdAt) < inviteCutoff) {
          m.status = 'declined';
          m.declinedReason = 'expired_10m';
          m.declinedAt = new Date().toISOString();
        }
      });

      const rawIncoming = (db.matchRequests || []).filter(m => 
        userIds.includes(String(m.toUserId)) && 
        m.status === 'pending' && 
        new Date(m.createdAt) >= inviteCutoff
      );
      rawIncoming.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const populated = rawIncoming.map(m => {
        const sender = db.users.find(u => String(u.id) === String(m.fromUserId) || String(u._id) === String(m.fromUserId));
        const post = db.requests.find(r => String(r.id) === String(m.targetPostId) || String(r._id) === String(m.targetPostId));
        if (!sender) return null;

        const timeRemainingMs = Math.max(0, 10 * 60 * 1000 - (Date.now() - new Date(m.createdAt).getTime()));

        return {
          id: String(m.id || m._id),
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
          createdAt: m.createdAt,
          timeRemainingSeconds: Math.floor(timeRemainingMs / 1000)
        };
      }).filter(Boolean);

      saveFallbackDb();
      return res.json({ incoming: populated });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// 2. Comprehensive Notifications Hub (Incoming, Declined/Expired, Accepted)
router.get('/notifications', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const inviteCutoff = new Date(Date.now() - 10 * 60 * 1000);

    if (getIsMongoConnected()) {
      // Auto-expire pending invites older than 10 mins
      await MatchRequest.updateMany(
        { $or: [{ toUserId: currentUserId }, { fromUserId: currentUserId }], status: 'pending', createdAt: { $lt: inviteCutoff } },
        { status: 'declined', declinedReason: 'expired_10m', declinedAt: new Date() }
      );

      // A. Incoming Invites
      const incomingList = await MatchRequest.find({
        toUserId: currentUserId,
        status: 'pending',
        createdAt: { $gte: inviteCutoff }
      }).sort({ createdAt: -1 });

      const incoming = await Promise.all(incomingList.map(async (m) => {
        const sender = await User.findById(m.fromUserId);
        const post = await Request.findById(m.targetPostId);
        if (!sender) return null;
        return {
          id: String(m._id),
          type: 'incoming_invite',
          title: `Match Request from ${sender.username}`,
          subtitle: `${m.senderRank || 'Diamond'} • ${m.senderPlatform || 'PC'} (${m.senderRegion || 'NA-East'})`,
          postMode: post?.mainMode || 'Battle Royale',
          senderName: sender.username,
          senderEpic: sender.epicTag,
          createdAt: m.createdAt
        };
      }));

      // B. Declined / Expired Invites Sent By User (not dismissed)
      const declinedList = await MatchRequest.find({
        fromUserId: currentUserId,
        status: 'declined',
        isDismissedBySender: { $ne: true }
      }).sort({ declinedAt: -1, createdAt: -1 }).limit(20);

      const declined = await Promise.all(declinedList.map(async (m) => {
        const targetUser = await User.findById(m.toUserId);
        const isExpired = m.declinedReason === 'expired_10m';
        return {
          id: String(m._id),
          type: isExpired ? 'invite_expired' : 'invite_declined',
          title: isExpired
            ? `⏱️ Invite Expired (10m)`
            : `❌ Request Declined`,
          subtitle: isExpired
            ? `Your match request to ${targetUser?.username || 'player'} expired without response.`
            : `${targetUser?.username || 'Player'} was unable to accept your invite.`,
          targetPlayer: targetUser?.username || 'Player',
          reason: m.declinedReason || 'rejected_by_user',
          createdAt: m.declinedAt || m.createdAt
        };
      }));

      // C. Accepted Match (Active)
      const acceptedMatch = await MatchRequest.findOne({
        fromUserId: currentUserId,
        status: 'accepted',
        isDismissedBySender: { $ne: true }
      }).sort({ matchedAt: -1 });

      let accepted = null;
      if (acceptedMatch) {
        const receiver = await User.findById(acceptedMatch.toUserId);
        accepted = {
          id: String(acceptedMatch._id),
          type: 'match_accepted',
          title: `🎉 Match Accepted!`,
          subtitle: `${receiver?.username || 'Teammate'} accepted your invite. Match Chat active!`,
          matchedPlayer: receiver?.username || 'Teammate',
          matchedAt: acceptedMatch.matchedAt
        };
      }

      const totalCount = incoming.filter(Boolean).length + declined.length + (accepted ? 1 : 0);

      return res.json({
        totalCount,
        incoming: incoming.filter(Boolean),
        declined,
        accepted
      });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      // Auto-expire
      (db.matchRequests || []).forEach(m => {
        if ((userIds.includes(String(m.toUserId)) || userIds.includes(String(m.fromUserId))) && m.status === 'pending' && new Date(m.createdAt) < inviteCutoff) {
          m.status = 'declined';
          m.declinedReason = 'expired_10m';
          m.declinedAt = new Date().toISOString();
        }
      });

      // A. Incoming
      const incoming = (db.matchRequests || [])
        .filter(m => userIds.includes(String(m.toUserId)) && m.status === 'pending' && new Date(m.createdAt) >= inviteCutoff)
        .map(m => {
          const sender = db.users.find(u => String(u.id) === String(m.fromUserId) || String(u._id) === String(m.fromUserId));
          const post = db.requests.find(r => String(r.id) === String(m.targetPostId) || String(r._id) === String(m.targetPostId));
          if (!sender) return null;
          return {
            id: String(m.id || m._id),
            type: 'incoming_invite',
            title: `Match Request from ${sender.username}`,
            subtitle: `${m.senderRank || 'Diamond'} • ${m.senderPlatform || 'PC'} (${m.senderRegion || 'NA-East'})`,
            postMode: post?.mainMode || 'Battle Royale',
            senderName: sender.username,
            senderEpic: sender.epicTag,
            createdAt: m.createdAt
          };
        }).filter(Boolean);

      // B. Declined
      const declined = (db.matchRequests || [])
        .filter(m => userIds.includes(String(m.fromUserId)) && m.status === 'declined' && !m.isDismissedBySender)
        .map(m => {
          const targetUser = db.users.find(u => String(u.id) === String(m.toUserId) || String(u._id) === String(m.toUserId));
          const isExpired = m.declinedReason === 'expired_10m';
          return {
            id: String(m.id || m._id),
            type: isExpired ? 'invite_expired' : 'invite_declined',
            title: isExpired
              ? `⏱️ Invite Expired (10m)`
              : `❌ Request Declined`,
            subtitle: isExpired
              ? `Your match request to ${targetUser?.username || 'player'} expired without response.`
              : `${targetUser?.username || 'Player'} was unable to accept your invite.`,
            targetPlayer: targetUser?.username || 'Player',
            reason: m.declinedReason || 'rejected_by_user',
            createdAt: m.declinedAt || m.createdAt
          };
        });

      // C. Accepted
      const acceptedMatch = (db.matchRequests || []).find(m => 
        userIds.includes(String(m.fromUserId)) && m.status === 'accepted' && !m.isDismissedBySender
      );
      let accepted = null;
      if (acceptedMatch) {
        const receiver = db.users.find(u => String(u.id) === String(acceptedMatch.toUserId) || String(u._id) === String(acceptedMatch.toUserId));
        accepted = {
          id: String(acceptedMatch.id || acceptedMatch._id),
          type: 'match_accepted',
          title: `🎉 Match Accepted!`,
          subtitle: `${receiver?.username || 'Teammate'} accepted your invite. Match Chat active!`,
          matchedPlayer: receiver?.username || 'Teammate',
          matchedAt: acceptedMatch.matchedAt
        };
      }

      saveFallbackDb();

      return res.json({
        totalCount: incoming.length + declined.length + (accepted ? 1 : 0),
        incoming,
        declined,
        accepted
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// 3. Clear All Notifications
router.post('/notifications/clear', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      await MatchRequest.updateMany(
        { fromUserId: currentUserId, status: { $in: ['declined', 'acknowledged'] } },
        { isDismissedBySender: true, status: 'acknowledged' }
      );
      return res.json({ success: true, message: 'Notifications cleared.' });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      (db.matchRequests || []).forEach(m => {
        if (userIds.includes(String(m.fromUserId)) && (m.status === 'declined' || m.status === 'acknowledged')) {
          m.isDismissedBySender = true;
          m.status = 'acknowledged';
        }
      });

      saveFallbackDb();
      return res.json({ success: true, message: 'Notifications cleared.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// 4. Dismiss Single Notification
router.delete('/notifications/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      await MatchRequest.findOneAndUpdate(
        { _id: matchId, fromUserId: currentUserId },
        { isDismissedBySender: true, status: 'acknowledged' }
      );
      return res.json({ success: true });
    } else {
      const db = getFallbackDb();
      const match = (db.matchRequests || []).find(m => String(m.id) === String(matchId) || String(m._id) === String(matchId));
      if (match) {
        match.isDismissedBySender = true;
        match.status = 'acknowledged';
        saveFallbackDb();
      }
      return res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

// 5. Accept Match (Deducts 1 pass for BOTH users on successful match!)
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

      if (matchReq.status !== 'pending') {
        return res.status(400).json({ error: `This request is already ${matchReq.status}.` });
      }

      matchReq.status = 'accepted';
      matchReq.matchedAt = new Date();
      await matchReq.save();

      const sender = await User.findById(matchReq.fromUserId);
      const receiver = await User.findById(currentUserId);

      // 👉 DEDUCT PASSES ON SUCCESSFUL MATCH:
      // For Receiver (Pool lookup owner)
      if (receiver && !receiver.isPremium) {
        receiver.postsCount = (receiver.postsCount || 0) + 1;
        await receiver.save();
      }

      // For Sender (Invite sender)
      if (sender && !sender.isPremium) {
        sender.invitesCount = (sender.invitesCount || 0) + 1;
        await sender.save();
      }

      // Remove BOTH receiver's post AND sender's earlier lookup from the pool
      await Request.deleteMany({ userId: { $in: [currentUserId, matchReq.fromUserId] } });
      
      // Decline other pending requests for these users
      await MatchRequest.updateMany(
        { toUserId: currentUserId, status: 'pending', _id: { $ne: matchId } },
        { status: 'declined', declinedReason: 'rejected_by_user', declinedAt: new Date() }
      );
      
      await MatchRequest.updateMany(
        { toUserId: matchReq.fromUserId, status: 'pending' },
        { status: 'declined', declinedReason: 'rejected_by_user', declinedAt: new Date() }
      );

      // Send Email to Invite Sender
      if (sender && sender.email) {
        sendInviteAcceptedEmail(
          sender.email,
          sender.username,
          receiver?.username || 'Your Teammate',
          receiver?.epicTag || receiver?.username
        ).catch(e => console.warn('Match accepted email error:', e));
      }

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

      if (matchReq.status !== 'pending') {
        return res.status(400).json({ error: `This request is already ${matchReq.status}.` });
      }

      matchReq.status = 'accepted';
      matchReq.matchedAt = new Date().toISOString();
      const sender = findFallbackUser(db, matchReq.fromUserId);
      const receiver = findFallbackUser(db, currentUserId);
      
      // 👉 DEDUCT PASSES ON SUCCESSFUL MATCH:
      if (receiver && !receiver.isPremium) {
        receiver.postsCount = (receiver.postsCount || 0) + 1;
      }
      if (sender && !sender.isPremium) {
        sender.invitesCount = (sender.invitesCount || 0) + 1;
      }

      // Clean active posts for both receiver AND sender
      const removeIds = [String(currentUserId), String(matchReq.fromUserId)];
      if (sender) removeIds.push(String(sender.id), String(sender._id));

      db.requests = (db.requests || []).filter(r => !removeIds.includes(String(r.userId)));

      // Decline other pending requests for these users
      db.matchRequests.forEach(m => {
        if (removeIds.includes(String(m.toUserId)) && m.status === 'pending' && String(m.id) !== matchId && String(m._id) !== matchId) {
          m.status = 'declined';
          m.declinedReason = 'rejected_by_user';
          m.declinedAt = new Date().toISOString();
        }
      });

      saveFallbackDb(db);

      // Send Email to Invite Sender
      if (sender && sender.email) {
        sendInviteAcceptedEmail(
          sender.email,
          sender.username,
          receiver?.username || 'Your Teammate',
          receiver?.epicTag || receiver?.username
        ).catch(e => console.warn('Match accepted email error:', e));
      }

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
    res.status(500).json({ error: 'Failed to accept match' });
  }
});

// 6. Decline Match
router.post('/:matchId/decline', async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      await MatchRequest.findByIdAndUpdate(matchId, {
        status: 'declined',
        declinedReason: 'rejected_by_user',
        declinedAt: new Date()
      });
    } else {
      const db = getFallbackDb();
      const matchReq = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (matchReq) {
        matchReq.status = 'declined';
        matchReq.declinedReason = 'rejected_by_user';
        matchReq.declinedAt = new Date().toISOString();
        saveFallbackDb();
      }
    }

    res.json({ success: true, message: 'Request declined.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline' });
  }
});

// 7. Get Accepted Match (For active live session)
router.get('/accepted', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      const match = await MatchRequest.findOne({
        fromUserId: currentUserId,
        status: 'accepted'
      }).sort({ matchedAt: -1 });

      if (!match) {
        return res.json({ hasAcceptedMatch: false });
      }

      const receiver = await User.findById(match.toUserId);
      const matchedAt = match.matchedAt || match.createdAt;
      const expiresAt = new Date(new Date(matchedAt).getTime() + 15 * 60 * 1000).toISOString();

      return res.json({
        hasAcceptedMatch: true,
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

      if (!match) {
        return res.json({ hasAcceptedMatch: false });
      }

      const receiver = db.users.find(u => String(u.id) === String(match.toUserId) || String(u._id) === String(match.toUserId));
      const matchedAt = match.matchedAt || match.createdAt;
      const expiresAt = new Date(new Date(matchedAt).getTime() + 15 * 60 * 1000).toISOString();

      return res.json({
        hasAcceptedMatch: true,
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

// 8. Dismiss Match Session
router.post('/dismiss', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      await MatchRequest.updateMany(
        { $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }], status: 'accepted' },
        { status: 'acknowledged', isDismissedBySender: true }
      );
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = user ? [String(user.id), String(user._id)] : [String(currentUserId)];

      (db.matchRequests || []).forEach(m => {
        if ((userIds.includes(String(m.fromUserId)) || userIds.includes(String(m.toUserId))) && m.status === 'accepted') {
          m.status = 'acknowledged';
          m.isDismissedBySender = true;
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
