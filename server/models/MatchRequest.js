import mongoose from 'mongoose';

const matchRequestSchema = new mongoose.Schema({
  fromUserId: {
    type: String,
    required: true
  },
  toUserId: {
    type: String,
    required: true
  },
  targetPostId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'acknowledged', 'declined_acknowledged'],
    default: 'pending'
  },
  senderPlatform: { type: String, default: 'PC' },
  senderRank: { type: String, default: 'Unranked' },
  senderRegion: { type: String, default: 'NA-East' },
  senderMic: { type: String, default: 'Yes' },
  senderLang: { type: String, default: 'English' },
  senderNote: { type: String, default: '' },
  declinedReason: { type: String, default: '' }, // 'rejected_by_user' | 'expired_10m'
  declinedAt: { type: Date },
  isDismissedBySender: { type: Boolean, default: false },
  isDismissedByReceiver: { type: Boolean, default: false },
  matchedAt: { type: Date },
  isChatEnded: { type: Boolean, default: false },
  chatEndedBy: { type: String, default: '' },
  chatEndedAt: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

matchRequestSchema.index({ fromUserId: 1, targetPostId: 1 }, { unique: true });
matchRequestSchema.index({ toUserId: 1, status: 1 });

export const MatchRequest = mongoose.model('MatchRequest', matchRequestSchema);
