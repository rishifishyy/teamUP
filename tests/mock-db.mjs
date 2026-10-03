let db;
export function resetDb() { db = { users: [], requests: [], matchRequests: [], chatMessages: [] }; }
resetDb();
export async function connectDB() {}
export function getIsMongoConnected() { return mongoConnected; }
export function getFallbackDb() { return db; }
export function saveFallbackDb(data) { if (data) db = data; }
let mongoConnected = false;
export function setMongoConnected(value) { mongoConnected = value; }
