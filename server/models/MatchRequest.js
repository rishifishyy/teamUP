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
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

matchRequestSchema.index({ fromUserId: 1, targetPostId: 1 }, { unique: true });
matchRequestSchema.index({ toUserId: 1, status: 1 });

export const MatchRequest = mongoose.model('MatchRequest', matchRequestSchema);
