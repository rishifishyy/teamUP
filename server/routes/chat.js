import express from 'express';
import jwt from 'jsonwebtoken';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';
import { MatchRequest } from '../models/MatchRequest.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { User } from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fortnite_teamup_super_secret_jwt_key_2026_production';
const CHAT_LIFESPAN_MS = 15 * 60 * 1000; // 15 minutes

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

// GET /api/chat/active-session (Guarantees BOTH players sync active and ended chat across all browsers & tabs)
router.get('/active-session', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    if (getIsMongoConnected()) {
      const activeMatch = await MatchRequest.findOne({
        $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
        status: 'accepted',
        isChatEnded: { $ne: true }
      }).sort({ matchedAt: -1, createdAt: -1 });

      if (!activeMatch) {
        // Check if there was a recently ended match
        const recentlyEndedMatch = await MatchRequest.findOne({
          $or: [{ fromUserId: currentUserId }, { toUserId: currentUserId }],
          status: 'accepted',
          isChatEnded: true
        }).sort({ chatEndedAt: -1, matchedAt: -1 });

        if (recentlyEndedMatch) {
          const endedTime = new Date(recentlyEndedMatch.chatEndedAt || recentlyEndedMatch.matchedAt || recentlyEndedMatch.createdAt).getTime();
          if (Date.now() - endedTime < CHAT_LIFESPAN_MS) {
            return res.json({
              hasActiveChat: false,
              isEnded: true,
              matchId: String(recentlyEndedMatch._id),
              endedBy: recentlyEndedMatch.chatEndedBy || 'Teammate',
              endedAt: recentlyEndedMatch.chatEndedAt
            });
          }
        }
        return res.json({ hasActiveChat: false });
      }

      const matchedTime = new Date(activeMatch.matchedAt || activeMatch.createdAt).getTime();
      const elapsed = Date.now() - matchedTime;
      const remainingSeconds = Math.max(0, Math.floor((CHAT_LIFESPAN_MS - elapsed) / 1000));
      if (remainingSeconds <= 0) return res.json({ hasActiveChat: false });

      const partnerId = String(activeMatch.fromUserId) === String(currentUserId) ? activeMatch.toUserId : activeMatch.fromUserId;
      const partner = await User.findById(partnerId);

      const matchId = String(activeMatch._id);
      const messagesCount = await ChatMessage.countDocuments({ matchId });

      return res.json({
        hasActiveChat: true,
        matchId,
        matchedPlayer: {
          username: partner?.username || 'Teammate',
          epicTag: partner?.epicTag || '',
          discordId: partner?.discordId || '',
          psnId: partner?.psnId || '',
          xboxId: partner?.xboxId || ''
        },
        remainingSeconds,
        matchedAt: new Date(matchedTime).toISOString(),
        expiresAt: new Date(matchedTime + CHAT_LIFESPAN_MS).toISOString(),
        messagesCount
      });
    } else {
      const db = getFallbackDb();
      const currentUserObj = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = currentUserObj ? [String(currentUserObj.id), String(currentUserObj._id)] : [String(currentUserId)];

      const activeMatch = (db.matchRequests || []).find(m => {
        const isParticipant = userIds.includes(String(m.fromUserId)) || userIds.includes(String(m.toUserId));
        const isAccepted = m.status === 'accepted';
        const notEnded = !m.isChatEnded;
        if (!isParticipant || !isAccepted || !notEnded) return false;

        const matchedTime = new Date(m.matchedAt || m.createdAt).getTime();
        return (Date.now() - matchedTime) < CHAT_LIFESPAN_MS;
      });

      if (!activeMatch) {
        // Check if there is a recently ended match for cross-browser sync
        const recentlyEndedMatch = (db.matchRequests || []).find(m => {
          const isParticipant = userIds.includes(String(m.fromUserId)) || userIds.includes(String(m.toUserId));
          const isAccepted = m.status === 'accepted';
          const isEnded = m.isChatEnded === true;
          if (!isParticipant || !isAccepted || !isEnded) return false;
          const endedTime = new Date(m.chatEndedAt || m.matchedAt || m.createdAt).getTime();
          return (Date.now() - endedTime) < CHAT_LIFESPAN_MS;
        });

        if (recentlyEndedMatch) {
          return res.json({
            hasActiveChat: false,
            isEnded: true,
            matchId: String(recentlyEndedMatch.id || recentlyEndedMatch._id),
            endedBy: recentlyEndedMatch.chatEndedBy || 'Teammate',
            endedAt: recentlyEndedMatch.chatEndedAt
          });
        }

        return res.json({ hasActiveChat: false });
      }

      const matchedTime = new Date(activeMatch.matchedAt || activeMatch.createdAt).getTime();
      const elapsed = Date.now() - matchedTime;
      const remainingSeconds = Math.max(0, Math.floor((CHAT_LIFESPAN_MS - elapsed) / 1000));
      if (remainingSeconds <= 0) return res.json({ hasActiveChat: false });

      const isFromMe = userIds.includes(String(activeMatch.fromUserId));
      const partnerId = isFromMe ? activeMatch.toUserId : activeMatch.fromUserId;
      const partner = db.users.find(u => String(u.id) === String(partnerId) || String(u._id) === String(partnerId));

      const matchId = String(activeMatch.id || activeMatch._id);
      const messagesCount = (db.chatMessages || []).filter(msg => String(msg.matchId) === matchId).length;

      return res.json({
        hasActiveChat: true,
        matchId,
        matchedPlayer: {
          username: partner?.username || 'Teammate',
          epicTag: partner?.epicTag || '',
          discordId: partner?.discordId || '',
          psnId: partner?.psnId || '',
          xboxId: partner?.xboxId || ''
        },
        remainingSeconds,
        matchedAt: new Date(matchedTime).toISOString(),
        expiresAt: new Date(matchedTime + CHAT_LIFESPAN_MS).toISOString(),
        messagesCount
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to check active chat' });
  }
});

// GET /api/chat/:matchId/messages
router.get('/:matchId/messages', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { matchId } = req.params;

    if (getIsMongoConnected()) {
      const match = await MatchRequest.findById(matchId);
      if (!match) return res.status(404).json({ error: 'Match session not found' });

      const isParticipant = String(match.fromUserId) === String(currentUserId) || String(match.toUserId) === String(currentUserId);
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
      if (match.status !== 'accepted') return res.status(403).json({ error: 'Match is not accepted or was declined.' });

      const matchedTime = new Date(match.matchedAt || match.createdAt).getTime();
      const elapsed = Date.now() - matchedTime;
      const remainingSeconds = Math.max(0, Math.floor((CHAT_LIFESPAN_MS - elapsed) / 1000));
      const isExpired = remainingSeconds <= 0;
      const isWarning = remainingSeconds > 0 && remainingSeconds <= 60;
      const isEnded = Boolean(match.isChatEnded);
      const endedBy = match.chatEndedBy || '';

      const messages = await ChatMessage.find({ matchId }).sort({ createdAt: 1 }).limit(150);

      return res.json({
        messages,
        remainingSeconds,
        isExpired,
        isWarning,
        isEnded,
        endedBy,
        expiresAt: new Date(matchedTime + CHAT_LIFESPAN_MS).toISOString()
      });
    } else {
      const db = getFallbackDb();
      const match = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (!match) return res.status(404).json({ error: 'Match session not found' });

      const currentUserObj = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = currentUserObj ? [String(currentUserObj.id), String(currentUserObj._id)] : [String(currentUserId)];

      const isParticipant = userIds.includes(String(match.fromUserId)) || userIds.includes(String(match.toUserId));
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
      if (match.status !== 'accepted') return res.status(403).json({ error: 'Match is not accepted or was declined.' });

      const matchedTime = new Date(match.matchedAt || match.createdAt).getTime();
      const elapsed = Date.now() - matchedTime;
      const remainingSeconds = Math.max(0, Math.floor((CHAT_LIFESPAN_MS - elapsed) / 1000));
      const isExpired = remainingSeconds <= 0;
      const isWarning = remainingSeconds > 0 && remainingSeconds <= 60;
      const isEnded = Boolean(match.isChatEnded);
      const endedBy = match.chatEndedBy || '';

      const messages = (db.chatMessages || []).filter(m => String(m.matchId) === matchId);

      return res.json({
        messages,
        remainingSeconds,
        isExpired,
        isWarning,
        isEnded,
        endedBy,
        expiresAt: new Date(matchedTime + CHAT_LIFESPAN_MS).toISOString()
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// POST /api/chat/:matchId/message
router.post('/:matchId/message', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { matchId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const cleanText = text.trim().slice(0, 500);

    if (getIsMongoConnected()) {
      const match = await MatchRequest.findById(matchId);
      if (!match) return res.status(404).json({ error: 'Match session not found' });

      const isParticipant = String(match.fromUserId) === String(currentUserId) || String(match.toUserId) === String(currentUserId);
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
      if (match.status !== 'accepted') return res.status(403).json({ error: 'Match is not accepted or was declined.' });

      if (match.isChatEnded) {
        return res.status(400).json({ error: 'Chat has been ended.', isEnded: true, endedBy: match.chatEndedBy });
      }

      const matchedTime = new Date(match.matchedAt || match.createdAt).getTime();
      if (Date.now() - matchedTime > CHAT_LIFESPAN_MS) {
        return res.status(400).json({ error: 'Chat session has expired after 15 minutes.', isExpired: true });
      }

      const sender = await User.findById(currentUserId);
      const newMsg = await ChatMessage.create({
        matchId,
        senderId: String(currentUserId),
        senderName: sender?.username || 'Player',
        text: cleanText
      });

      return res.status(201).json({ success: true, message: newMsg });
    } else {
      const db = getFallbackDb();
      if (!db.chatMessages) db.chatMessages = [];

      const match = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (!match) return res.status(404).json({ error: 'Match session not found' });

      const currentUserObj = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = currentUserObj ? [String(currentUserObj.id), String(currentUserObj._id)] : [String(currentUserId)];

      const isParticipant = userIds.includes(String(match.fromUserId)) || userIds.includes(String(match.toUserId));
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
      if (match.status !== 'accepted') return res.status(403).json({ error: 'Match is not accepted or was declined.' });

      if (match.isChatEnded) {
        return res.status(400).json({ error: 'Chat has been ended.', isEnded: true, endedBy: match.chatEndedBy });
      }

      const matchedTime = new Date(match.matchedAt || match.createdAt).getTime();
      if (Date.now() - matchedTime > CHAT_LIFESPAN_MS) {
        return res.status(400).json({ error: 'Chat session has expired after 15 minutes.', isExpired: true });
      }

      const sender = db.users.find(u => userIds.includes(String(u.id)) || userIds.includes(String(u._id)));
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        matchId: String(matchId),
        senderId: String(currentUserId),
        senderName: sender?.username || 'Player',
        text: cleanText,
        createdAt: new Date().toISOString()
      };

      db.chatMessages.push(newMsg);
      saveFallbackDb();

      return res.status(201).json({ success: true, message: newMsg });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to send chat message' });
  }
});

// POST /api/chat/:matchId/end
router.post('/:matchId/end', async (req, res) => {
  try {
    const currentUserId = getAuthUserId(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    const { matchId } = req.params;

    if (getIsMongoConnected()) {
      const match = await MatchRequest.findById(matchId);
      if (!match) return res.status(404).json({ error: 'Match session not found' });

      const isParticipant = String(match.fromUserId) === String(currentUserId) || String(match.toUserId) === String(currentUserId);
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

      const sender = await User.findById(currentUserId);
      match.isChatEnded = true;
      match.chatEndedBy = sender?.username || 'Teammate';
      match.chatEndedAt = new Date();
      await match.save();

      return res.json({ success: true, message: 'Chat session ended successfully.', endedBy: match.chatEndedBy });
    } else {
      const db = getFallbackDb();
      const match = (db.matchRequests || []).find(m => String(m.id) === matchId || String(m._id) === matchId);
      if (!match) return res.status(404).json({ error: 'Match session not found' });

      const currentUserObj = db.users.find(u => String(u.id) === String(currentUserId) || String(u._id) === String(currentUserId));
      const userIds = currentUserObj ? [String(currentUserObj.id), String(currentUserObj._id)] : [String(currentUserId)];

      const isParticipant = userIds.includes(String(match.fromUserId)) || userIds.includes(String(match.toUserId));
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

      const sender = db.users.find(u => userIds.includes(String(u.id)) || userIds.includes(String(u._id)));
      match.isChatEnded = true;
      match.chatEndedBy = sender?.username || 'Teammate';
      match.chatEndedAt = new Date().toISOString();

      saveFallbackDb();

      return res.json({ success: true, message: 'Chat session ended successfully.', endedBy: match.chatEndedBy });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to end chat session' });
  }
});

export default router;
