import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MongoClient, Db } from 'mongodb';
import {
  User,
  ConsultationRecord,
  DiseaseInformationDocument,
  DiagnosisDocument,
} from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for local NoSQL JSON fallback mirror
const dataDir = path.resolve(__dirname, '../data/nosql');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const usersFile = path.join(dataDir, 'users.json');
const diagnosesFile = path.join(dataDir, 'diagnoses.json');
const diseaseInfoFile = path.join(dataDir, 'disease_information.json');
const legacyConsultationsFile = path.join(dataDir, 'consultations.json');
const persistentDbFile = path.resolve(__dirname, '../data/nosql_db.json');
const legacyUnifiedFile = path.resolve(__dirname, '../data/nosql.json');

interface NoSqlCollections {
  users: User[];
  diagnoses: DiagnosisDocument[];
  disease_information: DiseaseInformationDocument[];
  consultations: ConsultationRecord[];
}

const store: NoSqlCollections = {
  users: [],
  diagnoses: [],
  disease_information: [],
  consultations: [],
};

// ----------------------------------------------------
// OFFICIAL MONGODB ATLAS CONNECTION ("agrimed" DB)
// ----------------------------------------------------
const MONGO_DB_NAME = 'agrimed';
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let mongoConnectPromise: Promise<Db | null> | null = null;

export interface MongoConnectionStatus {
  configured: boolean;
  connected: boolean;
  database: string;
  mode: 'mongodb_atlas' | 'local_fallback';
  error: string | null;
  label: string;
  lastCheckedAt: string;
  collections: {
    users: number;
    diagnoses: number;
    disease_information: number;
  };
}

let lastMongoError: string | null = null;
let lastCheckedAt: string = new Date().toISOString();

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getConfiguredMongoUri(): string {
  const raw = stripWrappingQuotes(process.env.MONGODB_URI || '');
  if (!raw || raw === 'MY_MONGODB_URI') return '';
  return raw;
}

function buildCandidateMongoUris(rawUri: string): { uris: string[]; placeholderError?: string } {
  const cleaned = stripWrappingQuotes(rawUri);
  const schemeMatch = cleaned.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!schemeMatch) {
    return { uris: [cleaned] };
  }

  const scheme = schemeMatch[1];
  const rest = schemeMatch[2];

  // Locate the authority portion (before first '/' or '?') and split on the LAST '@'
  // so unencoded '@' characters inside a password do not split the host prematurely.
  const pathStart = rest.search(/[/?]/);
  const authority = pathStart >= 0 ? rest.slice(0, pathStart) : rest;
  const suffix = pathStart >= 0 ? rest.slice(pathStart) : '';

  const lastAt = authority.lastIndexOf('@');
  if (lastAt < 0) {
    return { uris: [cleaned] };
  }

  const creds = authority.slice(0, lastAt);
  const host = authority.slice(lastAt + 1);
  const firstColon = creds.indexOf(':');
  if (firstColon < 0) {
    return { uris: [cleaned] };
  }

  const rawUser = creds.slice(0, firstColon);
  const rawPass = creds.slice(firstColon + 1);

  if (/^<(?:db_)?password>$/i.test(rawPass)) {
    return {
      uris: [],
      placeholderError:
        'MONGODB_URI still contains the <password> placeholder. Replace it with your real MongoDB Atlas Database Access password in Settings → Secrets.',
    };
  }

  const candidates: string[] = [];
  const addCandidate = (user: string, pass: string) => {
    const uri = `${scheme}${user}:${pass}@${host}${suffix}`;
    if (!candidates.includes(uri)) {
      candidates.push(uri);
    }
  };

  // 1. Exact cleaned URI first (works if already properly URL-encoded)
  addCandidate(rawUser, rawPass);

  // 2. Percent-encoded user & password (fixes unencoded @, #, :, /, ?, $, !, etc. in password)
  let decodedUser = rawUser;
  let decodedPass = rawPass;
  try {
    decodedUser = decodeURIComponent(rawUser);
  } catch {}
  try {
    decodedPass = decodeURIComponent(rawPass);
  } catch {}

  addCandidate(encodeURIComponent(decodedUser), encodeURIComponent(decodedPass));

  // If password wasn't validly percent-encoded (e.g. had raw '%'), encode raw directly
  addCandidate(encodeURIComponent(rawUser), encodeURIComponent(rawPass));

  // 3. If user accidentally left <...> angle brackets around an actual password
  if (rawPass.startsWith('<') && rawPass.endsWith('>') && rawPass.length > 2) {
    const unwrapped = rawPass.slice(1, -1);
    addCandidate(encodeURIComponent(decodedUser), encodeURIComponent(unwrapped));
  }

  return { uris: candidates };
}

export function isMongoConnected(): boolean {
  return Boolean(mongoDb);
}

export async function connectMongoAtlas(forceReconnect = false): Promise<Db | null> {
  const mongoUri = getConfiguredMongoUri();
  lastCheckedAt = new Date().toISOString();

  if (!mongoUri) {
    lastMongoError = null;
    mongoDb = null;
    return null;
  }

  if (mongoDb && !forceReconnect) {
    return mongoDb;
  }

  if (mongoConnectPromise && !forceReconnect) {
    return mongoConnectPromise;
  }

  mongoConnectPromise = (async () => {
    try {
      if (forceReconnect && mongoClient) {
        try {
          await mongoClient.close();
        } catch {}
        mongoClient = null;
        mongoDb = null;
      }

      const { uris, placeholderError } = buildCandidateMongoUris(mongoUri);
      if (placeholderError) {
        lastMongoError = placeholderError;
        lastCheckedAt = new Date().toISOString();
        mongoDb = null;
        console.warn(`[MongoDB Atlas] ${placeholderError}`);
        return null;
      }

      console.log(`[MongoDB Atlas] Connecting to database "${MONGO_DB_NAME}"...`);

      let connectedClient: MongoClient | null = null;
      let connectedDb: Db | null = null;
      let lastCandidateError: any = null;

      for (const candidateUri of uris) {
        const trialClient = new MongoClient(candidateUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        });
        try {
          await trialClient.connect();
          const db = trialClient.db(MONGO_DB_NAME);
          await db.command({ ping: 1 });
          connectedClient = trialClient;
          connectedDb = db;
          break;
        } catch (err: any) {
          lastCandidateError = err;
          try {
            await trialClient.close();
          } catch {}
          const errMsg = String(err?.message || '');
          // Only keep trying alternate credential encodings on auth/URI parse issues
          const isCredentialError =
            /bad auth|authentication failed|unescaped|invalid connection string|cannot be parsed/i.test(errMsg);
          if (!isCredentialError) {
            break;
          }
        }
      }

      if (!connectedClient || !connectedDb) {
        throw lastCandidateError || new Error('Unable to connect to MongoDB Atlas.');
      }

      mongoClient = connectedClient;
      mongoDb = connectedDb;
      lastMongoError = null;
      lastCheckedAt = new Date().toISOString();

      // Ensure helpful indexes exist in agrimed collections
      await connectedDb.collection<User>('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
      await connectedDb.collection<DiagnosisDocument>('diagnoses').createIndex({ userId: 1, createdAt: -1 }).catch(() => {});

      // Seed disease_information collection in MongoDB Atlas if empty so "agrimed" shows immediately in Data Explorer
      const diseaseCol = connectedDb.collection<DiseaseInformationDocument>('disease_information');
      const existingDiseaseCount = await diseaseCol.countDocuments();
      if (existingDiseaseCount === 0) {
        if (store.disease_information.length === 0) {
          seedVerifiedDiseaseInformation();
        }
        if (store.disease_information.length > 0) {
          await diseaseCol.insertMany(store.disease_information as any[]);
          console.log(`[MongoDB Atlas] Seeded ${store.disease_information.length} records into agrimed.disease_information.`);
        }
      } else {
        const atlasDiseases = await diseaseCol.find({}).toArray();
        if (atlasDiseases.length > 0) {
          store.disease_information = atlasDiseases;
          atomicSaveCollection(diseaseInfoFile, store.disease_information);
        }
      }

      // Warm local mirror cache from MongoDB Atlas
      const [atlasUsers, atlasDiagnoses, atlasConsultations] = await Promise.all([
        connectedDb.collection<User>('users').find({}).toArray().catch(() => []),
        connectedDb.collection<DiagnosisDocument>('diagnoses').find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => []),
        connectedDb.collection<ConsultationRecord>('consultations').find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => []),
      ]);

      if (atlasUsers.length > 0) {
        store.users = atlasUsers;
        atomicSaveCollection(usersFile, store.users);
      }
      if (atlasDiagnoses.length > 0) {
        store.diagnoses = atlasDiagnoses;
        atomicSaveCollection(diagnosesFile, store.diagnoses);
      }
      if (atlasConsultations.length > 0) {
        store.consultations = atlasConsultations;
        atomicSaveCollection(legacyConsultationsFile, store.consultations);
      }

      console.log(`[MongoDB Atlas] Connected cleanly to "${MONGO_DB_NAME}" (${atlasUsers.length} users, ${atlasDiagnoses.length} diagnoses, ${store.disease_information.length} disease_information).`);
      return connectedDb;
    } catch (err: any) {
      const rawMsg = err?.message || 'Unknown MongoDB connection error';
      const friendlyMsg = /bad auth|authentication failed/i.test(rawMsg)
        ? 'bad auth : authentication failed — Verify your Atlas Database Access username/password in Settings → Secrets → MONGODB_URI.'
        : rawMsg;
      lastMongoError = friendlyMsg;
      lastCheckedAt = new Date().toISOString();
      mongoDb = null;
      console.warn(`[MongoDB Atlas] Connection fallback active for "${MONGO_DB_NAME}":`, friendlyMsg);
      return null;
    } finally {
      mongoConnectPromise = null;
    }
  })();

  return mongoConnectPromise;
}

export async function getDbStatus(): Promise<MongoConnectionStatus> {
  const mongoUri = getConfiguredMongoUri();
  lastCheckedAt = new Date().toISOString();

  if (!mongoUri) {
    return {
      configured: false,
      connected: false,
      database: MONGO_DB_NAME,
      mode: 'local_fallback',
      error: 'MONGODB_URI is not configured in environment variables.',
      label: 'Local NoSQL Store (data/nosql_db.json)',
      lastCheckedAt,
      collections: {
        users: store.users.length,
        diagnoses: store.diagnoses.length,
        disease_information: store.disease_information.length,
      },
    };
  }

  // Re-try connection if disconnected so newly fixed credentials or IP allowlists take effect
  if (!mongoDb) {
    await connectMongoAtlas(true);
  }

  if (mongoDb) {
    try {
      await mongoDb.command({ ping: 1 });
      const [usersCount, diagnosesCount, diseasesCount] = await Promise.all([
        mongoDb.collection('users').countDocuments(),
        mongoDb.collection('diagnoses').countDocuments(),
        mongoDb.collection('disease_information').countDocuments(),
      ]);

      return {
        configured: true,
        connected: true,
        database: MONGO_DB_NAME,
        mode: 'mongodb_atlas',
        error: null,
        label: `🟢 Connected to MongoDB Atlas (${MONGO_DB_NAME})`,
        lastCheckedAt,
        collections: {
          users: usersCount,
          diagnoses: diagnosesCount,
          disease_information: diseasesCount,
        },
      };
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB ping failed';
      mongoDb = null;
    }
  }

  return {
    configured: true,
    connected: false,
    database: MONGO_DB_NAME,
    mode: 'local_fallback',
    error: lastMongoError || 'Unable to connect to MongoDB Atlas.',
    label: `MongoDB Atlas Error: ${lastMongoError || 'Connection failed'}`,
    lastCheckedAt,
    collections: {
      users: store.users.length,
      diagnoses: store.diagnoses.length,
      disease_information: store.disease_information.length,
    },
  };
}

// ----------------------------------------------------
// LOCAL PERSISTENT DISK MIRROR HELPERS
// ----------------------------------------------------
function syncPersistentDiskDb() {
  try {
    const dataDirParent = path.dirname(persistentDbFile);
    if (!fs.existsSync(dataDirParent)) {
      fs.mkdirSync(dataDirParent, { recursive: true });
    }
    const snapshot = {
      users: store.users,
      diagnoses: store.diagnoses,
      disease_information: store.disease_information,
      consultations: store.consultations,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(persistentDbFile, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write persistent data/nosql_db.json:', err);
  }
}

function atomicSaveCollection(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    syncPersistentDiskDb();
  } catch (err) {
    console.error(`Failed to save NoSQL file ${filePath}:`, err);
  }
}

function loadCollection<T>(filePath: string, defaultVal: T[]): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error loading NoSQL collection from ${filePath}:`, err);
  }
  atomicSaveCollection(filePath, defaultVal);
  return defaultVal;
}

export function generateDocId(prefix: string = 'doc'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${timestamp}${random}`;
}

export async function initNoSqlDatabase(): Promise<void> {
  console.log('Initializing NoSQL Document Database (users, diagnoses, disease_information)...');

  const sourceFile = fs.existsSync(persistentDbFile)
    ? persistentDbFile
    : fs.existsSync(legacyUnifiedFile)
      ? legacyUnifiedFile
      : null;

  if (sourceFile) {
    try {
      const unified = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
      if (Array.isArray(unified.users)) store.users = unified.users;
      if (Array.isArray(unified.diagnoses)) store.diagnoses = unified.diagnoses;
      if (Array.isArray(unified.disease_information)) store.disease_information = unified.disease_information;
      if (Array.isArray(unified.consultations)) store.consultations = unified.consultations;
    } catch (err) {
      console.error(`Error parsing ${sourceFile}:`, err);
    }
  }

  if (store.users.length === 0 && fs.existsSync(usersFile)) {
    store.users = loadCollection<User>(usersFile, []);
  }
  if (store.diagnoses.length === 0) store.diagnoses = loadCollection<DiagnosisDocument>(diagnosesFile, []);
  if (store.disease_information.length === 0) store.disease_information = loadCollection<DiseaseInformationDocument>(diseaseInfoFile, []);
  if (store.consultations.length === 0) store.consultations = loadCollection<ConsultationRecord>(legacyConsultationsFile, []);

  // Purge legacy dummy sandbox users
  const initialCount = store.users.length;
  store.users = store.users.filter(
    (u) => !u.googleId?.startsWith('google_sandbox_default_') && !u.googleId?.startsWith('g_preview_') && u.email !== 'farmer@agrimed.ai'
  );
  if (store.users.length !== initialCount) {
    atomicSaveCollection(usersFile, store.users);
  }

  // Seed baseline verified disease reference data (ICAR / FAO / CIBRC aligned) if empty
  if (store.disease_information.length === 0) {
    seedVerifiedDiseaseInformation();
  }

  syncPersistentDiskDb();

  // Connect to MongoDB Atlas "agrimed" database on server startup
  await connectMongoAtlas();

  console.log(
    `NoSQL Database ready [${mongoDb ? 'MongoDB Atlas: agrimed' : 'Local Disk Fallback'}]: ${store.users.length} users, ${store.diagnoses.length} diagnoses, ${store.disease_information.length} disease_information.`
  );
}

// ----------------------------------------------------
// 1. USERS COLLECTION (MongoDB Atlas + Local Fallback)
// ----------------------------------------------------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function sanitizeUser(user: User): User {
  const clone = { ...user };
  delete clone.passwordHash;
  clone.role = clone.role === 'admin' ? 'admin' : 'farmer';
  return clone;
}

function refreshUsersFromDiskIfNeeded() {
  try {
    if (fs.existsSync(persistentDbFile)) {
      const diskData = JSON.parse(fs.readFileSync(persistentDbFile, 'utf8'));
      if (Array.isArray(diskData.users)) {
        store.users = diskData.users;
      }
    }
  } catch {}
}

function upsertUserInLocalMirror(user: User) {
  refreshUsersFromDiskIfNeeded();
  const idx = store.users.findIndex((u) => u._id === user._id || u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) {
    store.users[idx] = user;
  } else {
    store.users.push(user);
  }
  atomicSaveCollection(usersFile, store.users);
}

export function findUserById(id: string): User | undefined {
  refreshUsersFromDiskIfNeeded();
  return store.users.find((u) => u._id === id);
}

export async function findUserByIdAsync(id: string): Promise<User | undefined> {
  if (mongoDb) {
    try {
      const doc = await mongoDb.collection<User>('users').findOne({ _id: id });
      if (doc) {
        upsertUserInLocalMirror(doc);
        return doc;
      }
      return undefined;
    } catch (err: any) {
      console.warn('[MongoDB Atlas] findUserById error:', err?.message);
    }
  }
  return findUserById(id);
}

export function findUserByGoogleId(googleId: string): User | undefined {
  refreshUsersFromDiskIfNeeded();
  return store.users.find((u) => u.googleId === googleId);
}

export function findUserByEmail(email: string): User | undefined {
  refreshUsersFromDiskIfNeeded();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email.toLowerCase() === normalized);
}

export async function findUserByEmailAsync(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  if (mongoDb) {
    try {
      const doc = await mongoDb.collection<User>('users').findOne({ email: normalized });
      if (doc) {
        upsertUserInLocalMirror(doc);
        return doc;
      }
      return undefined;
    } catch (err: any) {
      console.warn('[MongoDB Atlas] findUserByEmail error:', err?.message);
    }
  }
  return findUserByEmail(normalized);
}

export async function createUserWithPasswordAsync(data: {
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
}): Promise<User> {
  const now = new Date().toISOString();
  const normalizedEmail = data.email.trim().toLowerCase();
  const trimmedName = data.name.trim();
  const newUser: User = {
    _id: generateDocId('usr'),
    fullName: trimmedName,
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: hashPassword(data.password),
    authProvider: 'local',
    role: 'farmer',
    avatarUrl: data.avatarUrl || '',
    createdAt: now,
    lastLoginAt: now,
  };

  if (mongoDb) {
    try {
      await mongoDb.collection<User>('users').insertOne(newUser);
      console.log(`[MongoDB Atlas] Inserted new user into agrimed.users: ${newUser.email}`);
    } catch (err: any) {
      if (err?.code === 11000) throw err;
      lastMongoError = err?.message || 'MongoDB write failed';
      console.warn('[MongoDB Atlas] createUserWithPassword fallback:', lastMongoError);
      mongoDb = null;
    }
  }

  upsertUserInLocalMirror(newUser);
  return newUser;
}

export async function recordUserLoginAsync(userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (mongoDb) {
    try {
      await mongoDb.collection<User>('users').updateOne(
        { _id: userId },
        { $set: { lastLoginAt: now } }
      );
    } catch (err: any) {
      console.warn('[MongoDB Atlas] recordUserLogin error:', err?.message);
    }
  }
  refreshUsersFromDiskIfNeeded();
  const user = store.users.find((u) => u._id === userId);
  if (user) {
    user.lastLoginAt = now;
    atomicSaveCollection(usersFile, store.users);
  }
}

export async function upsertGoogleUserAsync(userData: {
  googleId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}): Promise<User> {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const now = new Date().toISOString();

  let existing: User | null | undefined = null;
  if (mongoDb) {
    try {
      existing = await mongoDb.collection<User>('users').findOne({
        $or: [
          ...(userData.googleId ? [{ googleId: userData.googleId }] : []),
          { email: normalizedEmail },
        ],
      });
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB read failed';
      console.warn('[MongoDB Atlas] upsertGoogleUser findOne fallback:', lastMongoError);
      mongoDb = null;
      refreshUsersFromDiskIfNeeded();
      existing = store.users.find(
        (u) => (userData.googleId && u.googleId === userData.googleId) || u.email.toLowerCase() === normalizedEmail
      );
    }
  } else {
    refreshUsersFromDiskIfNeeded();
    existing = store.users.find(
      (u) => (userData.googleId && u.googleId === userData.googleId) || u.email.toLowerCase() === normalizedEmail
    );
  }

  if (existing) {
    const resolvedName = userData.name?.trim() || existing.fullName || existing.name;
    const updatedUser: User = {
      ...existing,
      fullName: resolvedName,
      name: resolvedName,
      googleId: userData.googleId || existing.googleId,
      avatarUrl: userData.avatarUrl || existing.avatarUrl || '',
      authProvider: existing.authProvider || 'google',
      lastLoginAt: now,
      role: existing.role === 'admin' ? 'admin' : 'farmer',
    };

    if (mongoDb) {
      try {
        await mongoDb.collection<User>('users').updateOne(
          { _id: existing._id },
          {
            $set: {
              fullName: updatedUser.fullName,
              name: updatedUser.name,
              googleId: updatedUser.googleId,
              avatarUrl: updatedUser.avatarUrl,
              authProvider: updatedUser.authProvider,
              lastLoginAt: updatedUser.lastLoginAt,
              role: updatedUser.role,
            },
          }
        );
        console.log(`[MongoDB Atlas] Updated Google user in agrimed.users: ${updatedUser.email}`);
      } catch (err: any) {
        lastMongoError = err?.message || 'MongoDB update failed';
        console.warn('[MongoDB Atlas] upsertGoogleUser updateOne fallback:', lastMongoError);
        mongoDb = null;
      }
    }

    upsertUserInLocalMirror(updatedUser);
    return updatedUser;
  }

  const resolvedName = userData.name.trim();
  const newUser: User = {
    _id: generateDocId('usr'),
    googleId: userData.googleId,
    fullName: resolvedName,
    name: resolvedName,
    email: normalizedEmail,
    authProvider: 'google',
    avatarUrl: userData.avatarUrl || '',
    role: 'farmer',
    createdAt: now,
    lastLoginAt: now,
  };

  if (mongoDb) {
    try {
      await mongoDb.collection<User>('users').insertOne(newUser);
      console.log(`[MongoDB Atlas] Inserted Google user into agrimed.users: ${newUser.email}`);
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB insert failed';
      console.warn('[MongoDB Atlas] upsertGoogleUser insertOne fallback:', lastMongoError);
      mongoDb = null;
    }
  }

  upsertUserInLocalMirror(newUser);
  return newUser;
}

export async function getAllUsersAsync(): Promise<User[]> {
  if (mongoDb) {
    try {
      const docs = await mongoDb.collection<User>('users').find({}).sort({ createdAt: -1 }).toArray();
      return docs.map(sanitizeUser);
    } catch (err: any) {
      console.warn('[MongoDB Atlas] getAllUsers error:', err?.message);
    }
  }
  refreshUsersFromDiskIfNeeded();
  return store.users.map(sanitizeUser);
}

// ----------------------------------------------------
// 2. VERIFIED DISEASE INFORMATION COLLECTION (ICAR/FAO/CIBRC Aligned)
// ----------------------------------------------------
export function getAllDiseaseInformation(): DiseaseInformationDocument[] {
  return [...store.disease_information];
}

export async function getAllDiseaseInformationAsync(): Promise<DiseaseInformationDocument[]> {
  if (mongoDb) {
    try {
      const docs = await mongoDb.collection<DiseaseInformationDocument>('disease_information').find({}).toArray();
      if (docs.length > 0) {
        store.disease_information = docs;
        atomicSaveCollection(diseaseInfoFile, store.disease_information);
        return docs;
      }
    } catch (err: any) {
      console.warn('[MongoDB Atlas] getAllDiseaseInformation error:', err?.message);
    }
  }
  return getAllDiseaseInformation();
}

export function getDiseaseInformationById(id: string): DiseaseInformationDocument | undefined {
  return store.disease_information.find((d) => d._id === id);
}

export function lookupVerifiedDiseaseRecord(
  cropName: string,
  diseaseDetected: string
): DiseaseInformationDocument | null {
  const rawCrop = cropName.trim().toLowerCase();
  const c = rawCrop.includes('paddy') ? 'rice' : rawCrop.includes('maize') ? 'corn' : rawCrop;
  const d = diseaseDetected.trim().toLowerCase();

  let match = store.disease_information.find((doc) => {
    const docCrop = (doc.crop || '').toLowerCase();
    const docName = (doc.diseaseName || '').toLowerCase();
    const docSci = (doc.scientificName || '').toLowerCase();

    const cropMatches = docCrop === c || c.includes(docCrop) || docCrop.includes(c);
    const diseaseMatches = docName.includes(d) || d.includes(docName) || docSci.includes(d);
    return cropMatches && diseaseMatches;
  });

  if (match) return match;

  match = store.disease_information.find((doc) => {
    const docName = doc.diseaseName.toLowerCase();
    return docName === d || docName.includes(d) || d.includes(docName);
  });

  if (match) return match;

  const keywords = d.split(/[\s/,-]+/).filter((w) => w.length > 3);
  for (const doc of store.disease_information) {
    const docText = `${doc.diseaseName} ${doc.crop} ${doc.scientificName}`.toLowerCase();
    const matchedCount = keywords.filter((k) => docText.includes(k)).length;
    if (matchedCount >= 2) {
      return doc;
    }
  }

  return null;
}

export async function searchDiseaseInformationAsync(
  query: string,
  cropFilter?: string
): Promise<DiseaseInformationDocument[]> {
  const q = (query || '').trim().toLowerCase();
  const c = (cropFilter || '').trim().toLowerCase();

  const matchesDoc = (doc: DiseaseInformationDocument): boolean => {
    const docCrop = (doc.crop || '').toLowerCase();
    if (c && c !== 'all' && docCrop !== c && !docCrop.includes(c) && !c.includes(docCrop)) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      doc.diseaseName,
      doc.scientificName,
      doc.crop,
      doc.cropCategory,
      doc.pathogenType,
      doc.verifiedChemical,
      doc.activeIngredient,
      doc.organicAlternative,
      ...(Array.isArray(doc.symptoms) ? doc.symptoms : []),
      ...(Array.isArray(doc.culturalPractices) ? doc.culturalPractices : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (haystack.includes(q)) return true;
    const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
    return tokens.length > 0 && tokens.every((t) => haystack.includes(t));
  };

  if (mongoDb) {
    try {
      const docs = await mongoDb.collection<DiseaseInformationDocument>('disease_information').find({}).toArray();
      if (docs.length > 0) {
        store.disease_information = docs;
        atomicSaveCollection(diseaseInfoFile, store.disease_information);
      }
      return docs.filter(matchesDoc);
    } catch (err: any) {
      console.warn('[MongoDB Atlas] searchDiseaseInformation error:', err?.message);
    }
  }

  return store.disease_information.filter(matchesDoc);
}

export async function findDiseaseByCropAndNameAsync(
  crop: string,
  diseaseName: string
): Promise<DiseaseInformationDocument | null> {
  const c = crop.trim().toLowerCase();
  const d = diseaseName.trim().toLowerCase();
  const all = await getAllDiseaseInformationAsync();
  return (
    all.find(
      (doc) =>
        (doc.crop || '').trim().toLowerCase() === c &&
        (doc.diseaseName || '').trim().toLowerCase() === d
    ) || null
  );
}

export async function createOrUpdateDiseaseInformationAsync(
  doc: Partial<DiseaseInformationDocument>,
  _adminUserId: string
): Promise<DiseaseInformationDocument> {
  const _id = doc._id || generateDocId('info');
  const existingIdx = store.disease_information.findIndex((d) => d._id === _id);

  const safeDoseL = Number(doc.safeDosagePerLiter ?? (doc.safeDosagePer16LTank ? doc.safeDosagePer16LTank / 16 : 2.5));
  const safeDose16 = Number(doc.safeDosagePer16LTank ?? Math.round(safeDoseL * 16 * 100) / 100);

  const cleanDoc: DiseaseInformationDocument = {
    _id,
    diseaseName: doc.diseaseName || 'Verified Plant Disease',
    scientificName: doc.scientificName || 'Scientific taxon',
    crop: doc.crop || 'Universal',
    cropCategory: doc.cropCategory || 'Vegetables',
    pathogenType: doc.pathogenType || 'Fungal',
    verifiedChemical: doc.verifiedChemical || 'Mancozeb 75% WP',
    activeIngredient: doc.activeIngredient || doc.verifiedChemical || 'Mancozeb',
    tradeNames: Array.isArray(doc.tradeNames) ? doc.tradeNames : [],
    formulation: doc.formulation || 'WP',
    safeDosagePerLiter: Number.isFinite(safeDoseL) ? Math.round(safeDoseL * 100) / 100 : 2.5,
    dosageUnit: doc.dosageUnit === 'ml' ? 'ml' : 'g',
    safeDosagePer16LTank: Number.isFinite(safeDose16) ? Math.round(safeDose16 * 100) / 100 : 40,
    organicAlternative: doc.organicAlternative || 'Trichoderma harzianum 2% WP + Cold-Pressed Neem Oil',
    organicDosagePer16LTank: Number(doc.organicDosagePer16LTank ?? 80),
    organicUnit: doc.organicUnit === 'ml' ? 'ml' : 'g',
    phiDays: Number(doc.phiDays ?? 7),
    reiHours: Number(doc.reiHours ?? 24),
    sourceReference: doc.sourceReference || 'ICAR-IARI Field Guide / CIBRC 2024 Approved List',
    ...(Array.isArray(doc.sourceUrls) && doc.sourceUrls.length > 0 ? { sourceUrls: doc.sourceUrls } : {}),
    ...(doc.verificationStatus ? { verificationStatus: doc.verificationStatus } : {}),
    ...(Array.isArray(doc.symptoms) && doc.symptoms.length > 0 ? { symptoms: doc.symptoms } : {}),
    ...(doc.weatherConditions ? { weatherConditions: doc.weatherConditions } : {}),
    culturalPractices: Array.isArray(doc.culturalPractices) && doc.culturalPractices.length > 0
      ? doc.culturalPractices
      : ['Destroy infected crop residues', 'Sanitize tools'],
    safetyWarnings: Array.isArray(doc.safetyWarnings) && doc.safetyWarnings.length > 0
      ? doc.safetyWarnings
      : ['Wear nitrile gloves, mask, and eye protection while spraying'],
  };

  if (mongoDb) {
    try {
      await mongoDb
        .collection<DiseaseInformationDocument>('disease_information')
        .replaceOne({ _id }, cleanDoc, { upsert: true });
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB write failed';
      console.warn('[MongoDB Atlas] createOrUpdateDiseaseInformation fallback:', lastMongoError);
      mongoDb = null;
    }
  }

  if (existingIdx >= 0) {
    store.disease_information[existingIdx] = cleanDoc;
  } else {
    store.disease_information.unshift(cleanDoc);
  }

  atomicSaveCollection(diseaseInfoFile, store.disease_information);
  return cleanDoc;
}

export async function deleteDiseaseInformationAsync(id: string): Promise<boolean> {
  if (mongoDb) {
    try {
      await mongoDb.collection<DiseaseInformationDocument>('disease_information').deleteOne({ _id: id });
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB delete failed';
      console.warn('[MongoDB Atlas] deleteDiseaseInformation fallback:', lastMongoError);
      mongoDb = null;
    }
  }
  const prevCount = store.disease_information.length;
  store.disease_information = store.disease_information.filter((d) => d._id !== id);
  const removed = store.disease_information.length < prevCount;
  if (removed) {
    atomicSaveCollection(diseaseInfoFile, store.disease_information);
  }
  return removed;
}

// ----------------------------------------------------
// 3. DIAGNOSES COLLECTION (MongoDB Atlas + Local Fallback)
// ----------------------------------------------------
export async function saveDiagnosisDocAsync(
  doc: {
    crop: string;
    cropCategory?: string;
    imagePath?: string;
    isPlantImageValid: boolean;
    symptomsObserved: string[];
    diseaseDetected: string;
    scientificName?: string;
    confidenceScore: number;
    confidenceLevel: 'High' | 'Moderate' | 'Low';
    uncertaintyReason: string;
    alternativeDiagnoses: string[];
    verifiedTreatmentId?: string | null;
    verifiedTreatmentFound?: boolean;
    chemicalPrescription?: any;
    organicControl?: any;
    phiDays?: number;
    reiHours?: number;
    nextSteps: string[];
    consultExpertWarning: string;
    sourceReference?: string;
    notes?: string;
    tankSizeLiters?: number;
  },
  userId: string
): Promise<DiagnosisDocument> {
  const _id = generateDocId('diag');
  const now = new Date().toISOString();

  const diagnosisDoc: DiagnosisDocument = {
    _id,
    userId,
    crop: doc.crop,
    cropCategory: doc.cropCategory || 'Vegetables',
    imagePath: doc.imagePath || '',
    isPlantImageValid: doc.isPlantImageValid,
    symptomsObserved: doc.symptomsObserved || [],
    diseaseDetected: doc.diseaseDetected,
    scientificName: doc.scientificName || 'Unspecified pathogen',
    confidenceScore: doc.confidenceScore || 85,
    confidenceLevel: doc.confidenceLevel || 'Moderate',
    uncertaintyReason: doc.uncertaintyReason || '',
    alternativeDiagnoses: doc.alternativeDiagnoses || [],
    verifiedTreatmentId: doc.verifiedTreatmentId ?? null,
    verifiedTreatmentFound: Boolean(doc.verifiedTreatmentFound),
    chemicalPrescription: doc.chemicalPrescription,
    organicControl: doc.organicControl,
    phiDays: doc.phiDays,
    reiHours: doc.reiHours,
    nextSteps: doc.nextSteps || [],
    consultExpertWarning:
      doc.consultExpertWarning || 'Consult local Krishi Vigyan Kendra (KVK) if symptoms worsen within 48h.',
    sourceReference: doc.sourceReference,
    createdAt: now,
    notes: doc.notes || '',
    tankSizeLiters: doc.tankSizeLiters || 16,
  };

  const consultationDoc: ConsultationRecord = {
    _id,
    id: _id,
    userId,
    crop: diagnosisDoc.crop,
    cropCategory: diagnosisDoc.cropCategory || 'Vegetables',
    symptoms: diagnosisDoc.symptomsObserved,
    diseaseName: diagnosisDoc.diseaseDetected,
    scientificName: diagnosisDoc.scientificName || '',
    pathogenType: doc.chemicalPrescription ? 'Fungal / Verified' : 'Unspecified',
    confidenceScore: diagnosisDoc.confidenceScore,
    confidenceLevel: diagnosisDoc.confidenceLevel,
    uncertaintyReason: diagnosisDoc.uncertaintyReason,
    alternativeDiagnoses: diagnosisDoc.alternativeDiagnoses,
    verifiedTreatmentId: diagnosisDoc.verifiedTreatmentId,
    prescribedChemical: doc.chemicalPrescription?.name || 'No verified chemical recorded',
    chemicalDosagePerTank: doc.chemicalPrescription
      ? `${doc.chemicalPrescription.dosePer16LTank} ${doc.chemicalPrescription.unit} per 16L tank`
      : 'Consult agricultural officer',
    organicAlternative: doc.organicControl?.name || 'Bio-control under clinical evaluation',
    phiDays: doc.phiDays || 0,
    tankSizeLiters: diagnosisDoc.tankSizeLiters || 16,
    notes: diagnosisDoc.notes,
    nextSteps: diagnosisDoc.nextSteps,
    consultExpertWarning: diagnosisDoc.consultExpertWarning,
    imagePath: diagnosisDoc.imagePath,
    createdAt: now,
  };

  if (mongoDb) {
    try {
      await Promise.all([
        mongoDb.collection<DiagnosisDocument>('diagnoses').insertOne(diagnosisDoc),
        mongoDb.collection<ConsultationRecord>('consultations').insertOne(consultationDoc),
      ]);
      console.log(`[MongoDB Atlas] Saved diagnosis ${_id} into agrimed.diagnoses.`);
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB diagnosis insert failed';
      console.warn('[MongoDB Atlas] saveDiagnosisDoc fallback:', lastMongoError);
      mongoDb = null;
    }
  }

  store.diagnoses.unshift(diagnosisDoc);
  atomicSaveCollection(diagnosesFile, store.diagnoses);

  store.consultations.unshift(consultationDoc);
  atomicSaveCollection(legacyConsultationsFile, store.consultations);

  return diagnosisDoc;
}

export async function getUserDiagnosesAsync(
  userId: string,
  isAdmin: boolean = false,
  limit = 100
): Promise<DiagnosisDocument[]> {
  if (mongoDb) {
    try {
      const filter = isAdmin ? {} : { userId };
      return await mongoDb
        .collection<DiagnosisDocument>('diagnoses')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (err: any) {
      console.warn('[MongoDB Atlas] getUserDiagnoses error:', err?.message);
    }
  }
  const records = isAdmin ? store.diagnoses : store.diagnoses.filter((d) => d.userId === userId);
  return records.slice(0, limit);
}

export async function deleteDiagnosisAsync(
  id: string,
  userId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  let removedInMongo = false;
  if (mongoDb) {
    try {
      const filter = isAdmin ? { _id: id } : { _id: id, userId };
      const [diagDel, consDel] = await Promise.all([
        mongoDb.collection<DiagnosisDocument>('diagnoses').deleteOne(filter),
        mongoDb.collection<ConsultationRecord>('consultations').deleteOne(filter),
      ]);
      removedInMongo = diagDel.deletedCount > 0 || consDel.deletedCount > 0;
    } catch (err: any) {
      lastMongoError = err?.message || 'MongoDB diagnosis delete failed';
      console.warn('[MongoDB Atlas] deleteDiagnosis fallback:', lastMongoError);
      mongoDb = null;
    }
  }

  const initialCount = store.diagnoses.length;
  store.diagnoses = store.diagnoses.filter((d) => {
    if (d._id !== id) return true;
    return !(isAdmin || d.userId === userId);
  });

  const removedLocally = store.diagnoses.length < initialCount;
  if (removedLocally) {
    atomicSaveCollection(diagnosesFile, store.diagnoses);
    store.consultations = store.consultations.filter((c) => c._id !== id && String(c.id) !== id);
    atomicSaveCollection(legacyConsultationsFile, store.consultations);
  }
  return removedInMongo || removedLocally;
}

// ----------------------------------------------------
// BACKWARDS-COMPATIBLE CONSULTATIONS INTERFACE
// ----------------------------------------------------
export async function saveConsultationRecordAsync(record: any, userId: string): Promise<ConsultationRecord> {
  const dosageMatch = String(record.chemicalDosagePerTank || '').match(/([\d.]+)\s*([a-zA-Z]+)/);
  const parsedDose16L = dosageMatch ? parseFloat(dosageMatch[1]) : 16;
  const parsedUnit = dosageMatch ? dosageMatch[2] : 'ml';
  const tankSize = Number(record.tankSizeLiters) > 0 ? Number(record.tankSizeLiters) : 16;

  const savedDiag = await saveDiagnosisDocAsync(
    {
      crop: record.crop,
      cropCategory: record.cropCategory,
      imagePath: record.imagePath,
      isPlantImageValid: true,
      symptomsObserved: record.symptoms || [],
      diseaseDetected: record.diseaseName || record.diseaseDetected,
      scientificName: record.scientificName,
      confidenceScore: record.confidenceScore || 90,
      confidenceLevel: record.confidenceLevel || 'High',
      uncertaintyReason: record.uncertaintyReason || '',
      alternativeDiagnoses: record.alternativeDiagnoses || [],
      verifiedTreatmentId: record.verifiedTreatmentId ?? 'cibrc-verified',
      verifiedTreatmentFound: record.verifiedTreatmentId !== null,
      chemicalPrescription: record.prescribedChemical
        ? {
            name: record.prescribedChemical,
            activeIngredient: record.prescribedChemical,
            tradeNames: [],
            formulation: 'EC/WP',
            dosePerLiter: Number((parsedDose16L / 16).toFixed(2)),
            unit: parsedUnit,
            dosePer16LTank: parsedDose16L,
            applicationMethod: 'Foliar spray',
            sprayIntervalDays: 10,
            maxApplicationsPerSeason: 2,
            modeOfAction: 'Systemic / Contact',
            targetStage: 'Active vegetative',
          }
        : undefined,
      organicControl: {
        name: record.organicAlternative || 'Trichoderma / Neem Bio-Control',
        activeBioAgent: record.organicAlternative || 'Azadirachtin',
        formulation: 'WP',
        dosePerLiter: 5,
        unit: 'g',
        dosePer16LTank: 80,
        preparationInstructions: 'Dilute in clean spray water',
        applicationMethod: 'Foliar spray evening',
        mechanism: 'Hyperparasitism',
      },
      phiDays: record.phiDays || 0,
      reiHours: 24,
      nextSteps: record.recommendedNextSteps || ['Spray in calm weather', 'Check underside of leaves'],
      consultExpertWarning:
        record.whenToConsultExpert || 'Consult local agricultural extension center if symptoms persist.',
      sourceReference: record.sourceReference,
      notes: record.notes,
      tankSizeLiters: tankSize,
    },
    userId
  );

  const match = store.consultations.find((c) => c._id === savedDiag._id);
  return match || store.consultations[0];
}

export async function getConsultationHistoryAsync(
  userId: string,
  isAdmin: boolean = false,
  limit = 100
): Promise<ConsultationRecord[]> {
  if (mongoDb) {
    try {
      const filter = isAdmin ? {} : { userId };
      return await mongoDb
        .collection<ConsultationRecord>('consultations')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (err: any) {
      console.warn('[MongoDB Atlas] getConsultationHistory error:', err?.message);
    }
  }
  const userConsultations = isAdmin
    ? store.consultations
    : store.consultations.filter((c) => c.userId === userId);
  return userConsultations.slice(0, limit);
}

export async function deleteConsultationAsync(
  id: string | number,
  userId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  return deleteDiagnosisAsync(String(id), userId, isAdmin);
}

export async function getDatabaseStatsAsync(userId?: string, isAdmin: boolean = false) {
  if (mongoDb) {
    try {
      const filter = isAdmin || !userId ? {} : { userId };
      const [filteredDiagnoses, totalUsers, totalDiagnoses, totalVerifiedDiseases] = await Promise.all([
        mongoDb.collection<DiagnosisDocument>('diagnoses').find(filter).toArray(),
        mongoDb.collection('users').countDocuments(),
        mongoDb.collection('diagnoses').countDocuments(),
        mongoDb.collection('disease_information').countDocuments(),
      ]);

      const cropMap: Record<string, number> = {};
      for (const c of filteredDiagnoses) {
        cropMap[c.crop] = (cropMap[c.crop] || 0) + 1;
      }

      const cropStats = Object.entries(cropMap)
        .map(([crop, count]) => ({ crop, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return {
        totalConsultations: filteredDiagnoses.length,
        cropStats,
        totalUsers,
        totalDiagnoses,
        totalVerifiedDiseases,
        databaseEngine: `MongoDB Atlas (${MONGO_DB_NAME})`,
      };
    } catch (err: any) {
      console.warn('[MongoDB Atlas] getDatabaseStats error:', err?.message);
    }
  }

  const filtered = isAdmin || !userId ? store.diagnoses : store.diagnoses.filter((d) => d.userId === userId);

  const cropMap: Record<string, number> = {};
  for (const c of filtered) {
    cropMap[c.crop] = (cropMap[c.crop] || 0) + 1;
  }

  const cropStats = Object.entries(cropMap)
    .map(([crop, count]) => ({ crop, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    totalConsultations: filtered.length,
    cropStats,
    totalUsers: store.users.length,
    totalDiagnoses: store.diagnoses.length,
    totalVerifiedDiseases: store.disease_information.length,
    databaseEngine: getConfiguredMongoUri()
      ? 'Local Fallback (MongoDB Atlas Disconnected)'
      : 'NoSQL Document Store (ICAR/CIBRC Aligned)',
  };
}

// ----------------------------------------------------
// SEED VERIFIED AGRICULTURAL DATA (ICAR / FAO / CIBRC)
// ----------------------------------------------------
function seedVerifiedDiseaseInformation() {
  const list: DiseaseInformationDocument[] = [
    {
      _id: 'icar_wheat_yellow_rust',
      diseaseName: 'Stripe / Yellow Rust',
      scientificName: 'Puccinia striiformis f. sp. tritici',
      crop: 'Wheat',
      cropCategory: 'Grains & Cereals',
      pathogenType: 'Fungal',
      verifiedChemical: 'Propiconazole 25% EC (Tilt / Bumper)',
      activeIngredient: 'Propiconazole 25% EC',
      tradeNames: ['Tilt 25 EC', 'Bumper 25 EC'],
      formulation: '25% EC',
      safeDosagePerLiter: 1,
      dosageUnit: 'ml',
      safeDosagePer16LTank: 16,
      organicAlternative: 'Trichoderma viride + Cold-Pressed Neem Oil (10,000 ppm)',
      organicDosagePer16LTank: 80,
      organicUnit: 'g',
      phiDays: 30,
      reiHours: 24,
      sourceReference: 'ICAR-Indian Institute of Wheat and Barley Research (IIWBR) & CIBRC 2024 Approved List',
      culturalPractices: [
        'Sow resistant wheat cultivars (e.g., HD-2967, DBW-187, PBW-550)',
        'Avoid late sowing beyond the second week of November to escape virulent late-season rust cycles',
      ],
      safetyWarnings: [
        'Wear chemical-resistant nitrile gloves and eye goggles during knapsack tank filling',
        'Do not allow grazing livestock into the field for 14 days after spraying',
      ],
    },
    {
      _id: 'icar_wheat_brown_rust',
      diseaseName: 'Leaf / Brown Rust',
      scientificName: 'Puccinia triticina',
      crop: 'Wheat',
      cropCategory: 'Grains & Cereals',
      pathogenType: 'Fungal',
      verifiedChemical: 'Tebuconazole 25.9% m/m EC (Folicur)',
      activeIngredient: 'Tebuconazole 25.9% EC',
      tradeNames: ['Folicur', 'Orius'],
      formulation: '25.9% EC',
      safeDosagePerLiter: 1.25,
      dosageUnit: 'ml',
      safeDosagePer16LTank: 20,
      organicAlternative: 'Pseudomonas fluorescens 1.5% WP + Garlic-Chilli Extract',
      organicDosagePer16LTank: 80,
      organicUnit: 'g',
      phiDays: 35,
      reiHours: 24,
      sourceReference: 'ICAR-IIWBR Crop Protection Manual & CIBRC Central Pesticide Board',
      culturalPractices: [
        'Balanced nitrogen application; avoid excess urea which creates lush succulent leaves prone to rust',
        'Field monitoring starting early January across northern wheat belt',
      ],
      safetyWarnings: ['Maintain 10-meter buffer zone from fish ponds or open irrigation canals'],
    },
    {
      _id: 'icar_rice_blast',
      diseaseName: 'Rice Blast (Leaf & Neck Blast)',
      scientificName: 'Magnaporthe oryzae (Pyricularia oryzae)',
      crop: 'Rice',
      cropCategory: 'Grains & Cereals',
      pathogenType: 'Fungal',
      verifiedChemical: 'Tricyclazole 75% WP (Beam / Baan)',
      activeIngredient: 'Tricyclazole 75% WP',
      tradeNames: ['Beam 75 WP', 'Baan', 'Blastoff'],
      formulation: '75% WP',
      safeDosagePerLiter: 0.75,
      dosageUnit: 'g',
      safeDosagePer16LTank: 12,
      organicAlternative: 'Pseudomonas fluorescens (Pf-1 strain) 1.5% Liquid formulation',
      organicDosagePer16LTank: 80,
      organicUnit: 'ml',
      phiDays: 30,
      reiHours: 24,
      sourceReference: 'ICAR-National Rice Research Institute (NRRI) & CIBRC Schedule',
      culturalPractices: [
        'Split nitrogen top dressings into 3-4 split doses rather than heavy basal loading',
        'Maintain continuous shallow standing water (2-3 cm) during critical tillering',
      ],
      safetyWarnings: ['Highly toxic to aquatic organisms; prevent direct run-off into aquaculture ponds'],
    },
    {
      _id: 'icar_rice_bacterial_blight',
      diseaseName: 'Bacterial Leaf Blight (BLB)',
      scientificName: 'Xanthomonas oryzae pv. oryzae',
      crop: 'Rice',
      cropCategory: 'Grains & Cereals',
      pathogenType: 'Bacterial',
      verifiedChemical: 'Streptocycline (90:10) + Copper Oxychloride 50 WP',
      activeIngredient: 'Streptomycin sulphate 90% + Tetracycline 10% + COC',
      tradeNames: ['Streptocycline', 'Plantomycin', 'Blitox-50'],
      formulation: 'SP + WP Tank Mix',
      safeDosagePerLiter: 0.15,
      dosageUnit: 'g',
      safeDosagePer16LTank: 3,
      organicAlternative: 'Fresh Cow Dung Extract (20%) + Turmeric Rhizome Powder (2 g/L)',
      organicDosagePer16LTank: 300,
      organicUnit: 'ml',
      phiDays: 21,
      reiHours: 24,
      sourceReference: 'ICAR-NRRI Cuttack & Directorate of Rice Research (IIRR) Hyderabad',
      culturalPractices: [
        'Drain excess field water temporarily to reduce bacterial ooze spread through flood water',
        'Refrain from clipping seedling tips at transplanting',
      ],
      safetyWarnings: ['Wear protective mask to avoid inhaling antibiotic spray mist'],
    },
    {
      _id: 'icar_tomato_early_blight',
      diseaseName: 'Early Blight',
      scientificName: 'Alternaria solani',
      crop: 'Tomato',
      cropCategory: 'Vegetables',
      pathogenType: 'Fungal',
      verifiedChemical: 'Mancozeb 75% WP or Azoxystrobin 18.2% + Difenoconazole 11.4% SC',
      activeIngredient: 'Mancozeb 75% WP',
      tradeNames: ['Dithane M-45', 'Indofil M-45', 'Amistar Top'],
      formulation: '75% WP',
      safeDosagePerLiter: 2.5,
      dosageUnit: 'g',
      safeDosagePer16LTank: 40,
      organicAlternative: 'Trichoderma harzianum 2% WP (2x10^9 cfu/g) + Neem 10,000 ppm',
      organicDosagePer16LTank: 80,
      organicUnit: 'g',
      phiDays: 7,
      reiHours: 24,
      sourceReference: 'ICAR-Indian Institute of Vegetable Research (IIVR) Varanasi & CIBRC 2024',
      culturalPractices: [
        'Stake indeterminate plants and prune lower 30cm of senescing leaves to eliminate soil-splash inocula',
        'Drip irrigation only; avoid overhead sprinklers that wet canopy',
      ],
      safetyWarnings: ['Observe 7-day harvest waiting period strictly before picking fruits for market'],
    },
    {
      _id: 'icar_tomato_late_blight',
      diseaseName: 'Late Blight',
      scientificName: 'Phytophthora infestans',
      crop: 'Tomato',
      cropCategory: 'Vegetables',
      pathogenType: 'Oomycete',
      verifiedChemical: 'Metalaxyl-M 4% + Mancozeb 64% WP (Ridomil Gold)',
      activeIngredient: 'Metalaxyl-M + Mancozeb',
      tradeNames: ['Ridomil Gold 68 WG', 'Matco', 'Master'],
      formulation: '68% WG',
      safeDosagePerLiter: 2,
      dosageUnit: 'g',
      safeDosagePer16LTank: 32,
      organicAlternative: 'Copper Hydroxide 77% WP (Kocide) + Bordeaux Mixture (1%)',
      organicDosagePer16LTank: 35,
      organicUnit: 'g',
      phiDays: 5,
      reiHours: 24,
      sourceReference: 'ICAR-IIVR & FAO Global Solanaceous Pathology Guide',
      culturalPractices: [
        'Eradicate volunteer tomato/potato weeds near boundaries',
        'Spray immediately when daytime temperatures drop to 18-22°C with high relative humidity (>90%)',
      ],
      safetyWarnings: ['Avoid spraying within 48 hours of expected heavy rainfall to prevent wash-off'],
    },
    {
      _id: 'icar_potato_late_blight',
      diseaseName: 'Late Blight of Potato',
      scientificName: 'Phytophthora infestans',
      crop: 'Potato',
      cropCategory: 'Vegetables',
      pathogenType: 'Oomycete',
      verifiedChemical: 'Cymoxanil 8% + Mancozeb 64% WP (Curzate M8)',
      activeIngredient: 'Cymoxanil + Mancozeb',
      tradeNames: ['Curzate M8', 'Moximate', 'Acrobat'],
      formulation: '72% WP',
      safeDosagePerLiter: 2.5,
      dosageUnit: 'g',
      safeDosagePer16LTank: 40,
      organicAlternative: 'Bacillus subtilis + Potassium Silicate (2 ml/L)',
      organicDosagePer16LTank: 64,
      organicUnit: 'g',
      phiDays: 14,
      reiHours: 24,
      sourceReference: 'ICAR-Central Potato Research Institute (CPRI) Shimla & CIBRC',
      culturalPractices: [
        'Proper earthing up to create a 15-20cm soil ridge preventing sporangia wash into underground tubers',
        'Dehaulm crop 10 days prior to harvest if late blight occurs in late season',
      ],
      safetyWarnings: ['Do not compost infected haulms; burn or bury deeply off-field'],
    },
    {
      _id: 'icar_chilli_anthracnose',
      diseaseName: 'Anthracnose & Fruit Rot (Dieback)',
      scientificName: 'Colletotrichum capsici / C. gloeosporioides',
      crop: 'Chilli',
      cropCategory: 'Vegetables',
      pathogenType: 'Fungal',
      verifiedChemical: 'Azoxystrobin 18.2% + Difenoconazole 11.4% SC (Amistar Top)',
      activeIngredient: 'Azoxystrobin + Difenoconazole',
      tradeNames: ['Amistar Top', 'Godiwa Super', 'Priaxor'],
      formulation: '29.6% SC',
      safeDosagePerLiter: 1,
      dosageUnit: 'ml',
      safeDosagePer16LTank: 16,
      organicAlternative: 'Bacillus subtilis 1.5% WP + Panchagavya 3% foliar spray',
      organicDosagePer16LTank: 64,
      organicUnit: 'g',
      phiDays: 5,
      reiHours: 24,
      sourceReference: 'ICAR-Indian Institute of Horticultural Research (IIHR) Bengaluru & CIBRC',
      culturalPractices: [
        'Collect and destroy shriveled diseased pods away from the crop canopy',
        'Avoid excessive furrow flooding that elevates canopy microclimate humidity',
      ],
      safetyWarnings: ['Wear eye protection to prevent capsicum spray back into eyes'],
    },
    {
      _id: 'icar_cotton_boll_rot',
      diseaseName: 'Boll Rot Complex & Bacterial Blight',
      scientificName: 'Xanthomonas citri pv. malvacearum / Fusarium spp.',
      crop: 'Cotton',
      cropCategory: 'Cash Crops',
      pathogenType: 'Bacterial',
      verifiedChemical: 'Copper Oxychloride 50% WP + Streptocycline (90:10)',
      activeIngredient: 'Copper Oxychloride 50% + Streptomycin 90%',
      tradeNames: ['Blitox 50 WP', 'Cupramar', 'Streptocycline'],
      formulation: '50% WP',
      safeDosagePerLiter: 2.5,
      dosageUnit: 'g',
      safeDosagePer16LTank: 40,
      organicAlternative: 'Pseudomonas fluorescens 1.5% WP + Neem Oil 10,000 ppm',
      organicDosagePer16LTank: 80,
      organicUnit: 'g',
      phiDays: 21,
      reiHours: 24,
      sourceReference: 'ICAR-Central Institute for Cotton Research (CICR) Nagpur & CIBRC',
      culturalPractices: [
        'Adopt wider row spacing (90x60 cm) to allow sun penetration and wind aeration between cotton rows',
        'Remove early infected bottom squares and damaged bolls',
      ],
      safetyWarnings: ['Wear long pants and protective chemical apron while walking between tall cotton canopies'],
    },
    {
      _id: 'icar_coffee_leaf_rust',
      diseaseName: 'Coffee Leaf Rust (Roya)',
      scientificName: 'Hemileia vastatrix',
      crop: 'Coffee',
      cropCategory: 'Spices & Plantation',
      pathogenType: 'Fungal',
      verifiedChemical: 'Bordeaux Mixture (0.5% - 1.0%) or Hexaconazole 5% EC',
      activeIngredient: 'Copper sulphate + Quicklime (or Hexaconazole 5% EC)',
      tradeNames: ['Bordeaux Pre-Mix', 'Contaf 5 EC', 'Sitara'],
      formulation: '5% EC',
      safeDosagePerLiter: 2,
      dosageUnit: 'ml',
      safeDosagePer16LTank: 32,
      organicAlternative: 'Beauveria bassiana + Trichoderma harzianum + 1% Bordeaux Mixture',
      organicDosagePer16LTank: 80,
      organicUnit: 'g',
      phiDays: 30,
      reiHours: 24,
      sourceReference: 'Central Coffee Research Institute (CCRI) Balehonnur / Coffee Board of India',
      culturalPractices: [
        'Two mandatory pre-monsoon and post-monsoon umbrella shade tree prunings to permit 50-60% dappled sunlight',
        'Clean leaf underside coverage is mandatory when spraying knapsack lances',
      ],
      safetyWarnings: ['Ensure sprayers use brass nozzles with clean filters to avoid clogging with lime particles'],
    },
    {
      _id: 'icar_mango_anthracnose',
      diseaseName: 'Mango Anthracnose & Blossom Blight',
      scientificName: 'Colletotrichum gloeosporioides',
      crop: 'Mango',
      cropCategory: 'Fruits',
      pathogenType: 'Fungal',
      verifiedChemical: 'Carbendazim 12% + Mancozeb 63% WP (Saaf)',
      activeIngredient: 'Carbendazim + Mancozeb',
      tradeNames: ['Saaf', 'Sixer', 'Companion'],
      formulation: '75% WP',
      safeDosagePerLiter: 2,
      dosageUnit: 'g',
      safeDosagePer16LTank: 32,
      organicAlternative: 'Ampelomyces quisqualis + Cold Pressed Neem Oil 1500 ppm',
      organicDosagePer16LTank: 60,
      organicUnit: 'ml',
      phiDays: 15,
      reiHours: 24,
      sourceReference: 'ICAR-Central Institute for Subtropical Horticulture (CISH) Lucknow',
      culturalPractices: [
        'Prune dead twigs 10 cm below infected margins and paste cut surfaces with copper oxychloride paste',
        'Avoid spraying during peak honeybee foraging hours (9 AM - 12 PM) during flowering',
      ],
      safetyWarnings: ['Highly toxic to beneficial pollinators; avoid direct spray onto open blossoms'],
    },
    {
      _id: 'icar_corn_fall_armyworm',
      diseaseName: 'Fall Armyworm & Turcicum Leaf Blight',
      scientificName: 'Spodoptera frugiperda / Exserohilum turcicum',
      crop: 'Corn',
      cropCategory: 'Grains & Cereals',
      pathogenType: 'Pest / Insect / Mite',
      verifiedChemical: 'Chlorantraniliprole 18.5% SC (Coragen) or Emamectin Benzoate 5% SG',
      activeIngredient: 'Chlorantraniliprole 18.5% SC',
      tradeNames: ['Coragen', 'Proclaim', 'Voliam'],
      formulation: '18.5% SC',
      safeDosagePerLiter: 0.4,
      dosageUnit: 'ml',
      safeDosagePer16LTank: 6.5,
      organicAlternative: 'Metarhizium anisopliae (or Bt kurstaki) 1.15% WP @ 5 g/L applied directly into whorls',
      organicDosagePer16LTank: 80,
      organicUnit: 'g',
      phiDays: 14,
      reiHours: 24,
      sourceReference: 'ICAR-Indian Institute of Maize Research (IIMR) Ludhiana & CIBRC Ad-hoc Protocol',
      culturalPractices: [
        'Direct spray nozzle cone strictly into central plant whorl, not broadcast on outer leaves',
        'Install 5 pheromone traps per acre for early detection of adult moths',
      ],
      safetyWarnings: ['Wear respirator mask when directing spray into whorls'],
    },
  ];

  store.disease_information = list;
  atomicSaveCollection(diseaseInfoFile, store.disease_information);
  console.log(`Seeded ${list.length} verified ICAR/FAO/CIBRC disease reference records.`);
}
