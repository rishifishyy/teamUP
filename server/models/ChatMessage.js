import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxLength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
