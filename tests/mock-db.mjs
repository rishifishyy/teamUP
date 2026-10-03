let db;
export function resetDb() { db = { users: [], requests: [], matchRequests: [], chatMessages: [] }; }
resetDb();
export async function connectDB() {}
export function getIsMongoConnected() { return false; }
export function getFallbackDb() { return db; }
export function saveFallbackDb(data) { if (data) db = data; }
