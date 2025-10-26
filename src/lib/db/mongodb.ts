import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

export type WithId<T> = T & { _id: ObjectId };

export interface Collections {
  users: Collection;
  reports: Collection;
  votes: Collection;
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
  collections: Collections;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/improve-my-city';
const DB_NAME = MONGODB_URI.split('/').pop() || 'improve-my-city';

let singleton: Promise<MongoConnection> | null = null;
let indexesEnsured = false;

async function ensureIndexes(db: Db) {
  if (indexesEnsured) return;
  // Users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ phone: 1 }, { unique: true });
  await db.collection('users').createIndex({ createdAt: -1 });

  // Reports
  await db.collection('reports').createIndex({ reportNumber: 1 }, { unique: true });
  await db.collection('reports').createIndex({ userId: 1 });
  await db.collection('reports').createIndex({ category: 1 });
  await db.collection('reports').createIndex({ status: 1 });
  await db.collection('reports').createIndex({ createdAt: -1 });
  await db.collection('reports').createIndex({ location: '2dsphere' });

  // Votes
  await db.collection('votes').createIndex({ userId: 1, reportId: 1 }, { unique: true });
  await db.collection('votes').createIndex({ createdAt: -1 });

  indexesEnsured = true;
}

async function connectMongo(): Promise<MongoConnection> {
  const maxPoolSize = Number(process.env.MONGODB_MAX_POOL || 10);
  const retries = 3;
  let attempt = 0;
  let lastErr: unknown = null;

  while (attempt < retries) {
    try {
      attempt++;
      const client = new MongoClient(MONGODB_URI, {
        maxPoolSize,
        serverSelectionTimeoutMS: 8000,
        retryReads: true,
        retryWrites: true,
      });
      await client.connect();
      const db = client.db(DB_NAME);
      await ensureIndexes(db);
      const collections: Collections = {
        users: db.collection('users'),
        reports: db.collection('reports'),
        votes: db.collection('votes'),
      };

      // Graceful shutdown
      if (typeof process !== 'undefined') {
        const close = async () => {
          try {
            await client.close();
          } catch {}
        };
        process.on('SIGINT', close);
        process.on('SIGTERM', close);
      }

      return { client, db, collections };
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      const backoff = Math.min(500 * 2 ** (attempt - 1), 2000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to connect to MongoDB');
}

export async function getMongo(): Promise<MongoConnection> {
  // In dev, reuse global to avoid creating new clients on HMR
  const g = globalThis as unknown as { __mongoConn?: Promise<MongoConnection> };
  if (process.env.NODE_ENV !== 'production') {
    if (!g.__mongoConn) g.__mongoConn = connectMongo();
    return g.__mongoConn;
  }
  if (!singleton) singleton = connectMongo();
  return singleton;
}

export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}
