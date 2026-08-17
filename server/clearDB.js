import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fallbackDbPath = path.join(__dirname, '../data/db_fallback.json');

async function clearDatabases() {
  console.log('Clearing Databases...');

  try {
    const emptyDb = {
      users: [],
      requests: [],
      matchRequests: []
    };
    if (!fs.existsSync(path.dirname(fallbackDbPath))) {
      fs.mkdirSync(path.dirname(fallbackDbPath), { recursive: true });
    }
    fs.writeFileSync(fallbackDbPath, JSON.stringify(emptyDb, null, 2));
    console.log('Fallback DB (db_fallback.json) cleared successfully.');
  } catch (err) {
    console.error('Error clearing fallback DB:', err.message);
  }

  try {
    const MONGO_URI = 'mongodb://127.0.0.1:27017/teamup'; // Same as server/db.js
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB. Dropping collections...');
    
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`Cleared collection: ${collection.collectionName}`);
    }

    console.log('MongoDB cleared successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.log('MongoDB not connected or error during wipe:', err.message);
  }

  console.log('Database wipe complete.');
  process.exit(0);
}

clearDatabases();
