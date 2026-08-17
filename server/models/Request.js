import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  gamertag: {
    type: String,
    required: true,
    trim: true
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
    required: true,
    default: 'NA-East'
  },
  mainMode: {
    type: String,
    required: true,
    enum: ['Ranked', 'Unranked', 'Creative'],
    default: 'Ranked'
  },
  buildType: {
    type: String,
    enum: ['Build', 'No Build'],
    default: 'Build'
  },
  creativeType: {
    type: String,
    enum: ['Box Fight', 'Zonewars'],
    default: 'Box Fight'
  },
  teamSize: {
    type: String,
    required: true,
    enum: ['Duos', 'Trios', 'Squads'],
    default: 'Duos'
  },
  platform: {
    type: String,
    required: true,
    default: 'PC'
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
  rank: {
    type: String,
    default: 'Diamond'
  },
  userAge: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const Request = mongoose.models.Request || mongoose.model('Request', requestSchema);
