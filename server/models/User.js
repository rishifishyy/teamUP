import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  epicTag: {
    type: String,
    required: true,
    trim: true
  },
  psnId: {
    type: String,
    trim: true,
    default: ''
  },
  xboxId: {
    type: String,
    trim: true,
    default: ''
  },
  discordId: {
    type: String,
    trim: true,
    default: ''
  },
  region: {
    type: String,
    default: 'NA-East'
  },
  langPrimary: {
    type: String,
    default: 'English'
  },
  langSecondary: {
    type: String,
    default: 'None'
  },
  hasMic: {
    type: Boolean,
    default: true
  },
  age: {
    type: Number,
    required: true,
    min: 13
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  subscription: {
    plan: { type: String, enum: ['Free', '1 Month', '3 Months', '6 Months', '12 Months'], default: 'Free' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    history: [{
      plan: String,
      amount: Number,
      date: Date,
      paymentId: String
    }]
  },
  lastPostDate: {
    type: Date,
    default: null
  },
  avatarSeed: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
