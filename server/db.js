import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'db_fallback.json');

let fallbackDb = {
  users: [],
  requests: [],
  matchRequests: [],
  chatMessages: []
};

function initFallbackDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      fallbackDb = JSON.parse(content);
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(fallbackDb, null, 2));
    }
  } catch (e) {
    console.warn('Fallback DB init warning:', e.message);
  }
}

export function saveFallbackDb(data) {
  try {
    if (data) {
      fallbackDb = data;
    }
    if (!fallbackDb.users) fallbackDb.users = [];
    if (!fallbackDb.requests) fallbackDb.requests = [];
    if (!fallbackDb.matchRequests) fallbackDb.matchRequests = [];
    if (!fallbackDb.chatMessages) fallbackDb.chatMessages = [];

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallbackDb, null, 2));
  } catch (e) {
    console.warn('Failed to save fallback DB:', e.message);
  }
}

let isMongoConnected = false;

export async function connectDB() {
  initFallbackDb();
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teamup';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (err) {
    isMongoConnected = false;
    console.log(`ℹ️ MongoDB not detected locally. Operating in resilient Local/JSON database mode (data/db_fallback.json).`);
  }
}

export function getFallbackDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      fallbackDb = JSON.parse(content);
    }
  } catch (e) {
    console.warn('Fallback DB read warning:', e.message);
  }
  if (!fallbackDb.users) fallbackDb.users = [];
  if (!fallbackDb.requests) fallbackDb.requests = [];
  if (!fallbackDb.matchRequests) fallbackDb.matchRequests = [];
  if (!fallbackDb.chatMessages) fallbackDb.chatMessages = [];
  return fallbackDb;
}

export function getIsMongoConnected() {
  return isMongoConnected;
}
