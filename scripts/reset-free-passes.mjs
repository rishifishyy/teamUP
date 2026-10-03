import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FREE_PASS_RESET } from '../server/freePasses.js';

const apply = process.argv.includes('--apply');
const backupArg = process.argv.indexOf('--backup');
const backupPath = backupArg >= 0 ? process.argv[backupArg + 1] : null;
if (apply && !backupPath) throw new Error('--apply requires --backup <local-file-path>.');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) throw new Error('Configure the TeamUP MongoDB URI before running this script.');
let connection;
try {
  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 }).asPromise();
  const users = connection.db.collection('users');
  const previous = await users.find({}, { projection: { _id: 1, postsCount: 1, invitesCount: 1, freePassesRefillAt: 1, isPremium: 1, subscription: 1 } }).toArray();
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', accounts: previous.length, premiumAccounts: previous.filter(user => user.isPremium).length }));
  if (apply) {
    await fs.mkdir(path.dirname(path.resolve(backupPath)), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify({ backedUpAt: new Date(), database: connection.db.databaseName, users: previous }, null, 2), { flag: 'wx' });
    const result = await users.updateMany({}, { $set: FREE_PASS_RESET });
    const current = await users.find({}, { projection: { _id: 1, postsCount: 1, invitesCount: 1, freePassesRefillAt: 1, isPremium: 1, subscription: 1 } }).toArray();
    const oldById = new Map(previous.map(user => [String(user._id), user]));
    const resetVerified = current.every(user => user.postsCount === 0 && user.invitesCount === 0 && user.freePassesRefillAt === null);
    const premiumPreserved = current.every(user => {
      const old = oldById.get(String(user._id));
      return !old || (old.isPremium === user.isPremium && JSON.stringify(old.subscription) === JSON.stringify(user.subscription));
    });
    console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount, resetVerified, premiumPreserved }));
    if (!resetVerified || !premiumPreserved) process.exitCode = 1;
  }
} catch (error) {
  console.error(`Free-pass reset failed (${error.name}).`);
  process.exitCode = 1;
} finally { if (connection) await connection.close(); }
