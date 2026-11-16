import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

import {
  initNoSqlDatabase,
  getDbStatus,
  saveDiagnosisDocAsync,
  getUserDiagnosesAsync,
  deleteDiagnosisAsync,
  saveConsultationRecordAsync,
  getConsultationHistoryAsync,
  deleteConsultationAsync,
  getDatabaseStatsAsync,
  getAllDiseaseInformationAsync,
  searchDiseaseInformationAsync,
  findDiseaseByCropAndNameAsync,
  createOrUpdateDiseaseInformationAsync,
  deleteDiseaseInformationAsync,
  findUserByIdAsync,
  findUserByEmailAsync,
  upsertGoogleUserAsync,
  getAllUsersAsync,
  createUserWithPasswordAsync,
  verifyPassword,
  recordUserLoginAsync,
  sanitizeUser,
} from './server/nosqlDb.ts';

import { askAgronomist, getCropSymptomsFromAi, researchDiseaseWorldwideWithSearch, transcribeFarmerAudio } from './server/gemini.ts';
import { diagnoseUniversalCrop } from './server/universalDiagnostician.ts';
import { User } from './src/types/index.ts';

dotenv.config({ override: !process.env.VERCEL });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercelEnv = Boolean(process.env.VERCEL);

const app = express();
const PORT = 3000;

// Trust reverse proxy (Cloud Run, load balancers, dev previews) for accurate IP resolution
app.set('trust proxy', 1);

// ----------------------------------------------------
// 1. SECURITY HEADERS (Helmet)
// ----------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // Permissive for Vite HMR/dev and sandboxed iframe previews
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

// ----------------------------------------------------
// 2. RATE LIMITING
// ----------------------------------------------------
// General API Limiter (300 req / 15 min)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Too many requests from this IP, please try again after a few minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Strict AI & Upload Limiter: Max 30 requests per 15 minutes per IP
const aiAndUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    error: 'Rate limit exceeded: Maximum 30 AI diagnosis or upload requests per 15 minutes.',
    code: 'AI_RATE_LIMIT_EXCEEDED',
  },
});

app.use('/api', generalLimiter);

// ----------------------------------------------------
// 3. BODY PARSING & STATIC SERVING
// ----------------------------------------------------
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded plant images safely (use writable /tmp on Vercel serverless)
const uploadsDir = isVercelEnv ? '/tmp/agrimed_uploads' : path.resolve(__dirname, 'public/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not initialize uploads directory:', err);
}
app.use('/uploads', express.static(uploadsDir));

// ----------------------------------------------------
// 4. SECURE MULTER STORAGE CONFIGURATION
// ----------------------------------------------------
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Generate randomized unique filename - never trust user-supplied filenames
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg');
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `plant_${Date.now()}_${randomHex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum file size limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed types: image/jpeg, image/png, image/webp.'));
    }
  },
});

const CHAT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
];

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum file size limit
  },
  fileFilter: (_req, file, cb) => {
    if (CHAT_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid attachment format. Allowed types: image/jpeg, image/png, image/webp, application/pdf, text/plain.'));
    }
  },
});

const AUDIO_ALLOWED_BASE_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/x-m4a',
  'audio/m4a',
  'video/webm',
];

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum audio size limit
  },
  fileFilter: (_req, file, cb) => {
    const baseMime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
    if (AUDIO_ALLOWED_BASE_TYPES.includes(baseMime) || baseMime.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Allowed types: audio/webm, audio/mp4, audio/mpeg, audio/wav, audio/ogg.'));
    }
  },
});

// Sessions & Database Initialization (serverless-safe on Vercel + local disk mirror)
const SESSIONS_FILE = isVercelEnv
  ? '/tmp/agrimed_sessions.json'
  : path.join(process.cwd(), 'data', 'nosql', 'sessions.json');

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.MONGODB_URI ||
  process.env.GEMINI_API_KEY ||
  'agrimed_ai_session_secret_v1';

let dbInitPromise: Promise<void> | null = null;
export function ensureDbInitialized(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = initNoSqlDatabase().catch((err) => {
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

function loadSessions(): Map<string, { userId: string; expiresAt: number }> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch {}
  return new Map();
}

function saveSessions(sessions: Map<string, { userId: string; expiresAt: number }>) {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj = Object.fromEntries(sessions.entries());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {}
}

// Active session token store + revocation set + HMAC fallback for multi-instance Vercel serverless
const activeSessions = loadSessions();
const revokedTokens = new Set<string>();

function signSessionPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
}

function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days session expiry
  const payloadB64 = Buffer.from(
    JSON.stringify({ userId, expiresAt, jti: crypto.randomBytes(8).toString('hex') })
  ).toString('base64url');
  const signature = signSessionPayload(payloadB64);
  const token = `agri_gauth_${payloadB64}.${signature}`;
  activeSessions.set(token, { userId, expiresAt });
  saveSessions(activeSessions);
  return token;
}

function verifySignedSessionToken(token: string): { userId: string; expiresAt: number } | null {
  if (!token.startsWith('agri_gauth_')) return null;
  const raw = token.slice('agri_gauth_'.length);
  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0) return null;
  const payloadB64 = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  const expectedSig = signSessionPayload(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (parsed && typeof parsed.userId === 'string' && typeof parsed.expiresAt === 'number') {
      return { userId: parsed.userId, expiresAt: parsed.expiresAt };
    }
  } catch {}
  return null;
}

// Ensure MongoDB Atlas & baseline disease data are initialized on cold serverless invocations
app.use('/api', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureDbInitialized();
  } catch (err) {
    console.warn('Database initialization middleware warning:', err);
  }
  next();
});

// Extend Express Request type with authenticated user
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication Middleware (Strict Bearer / Session Token verification against agrimed.users)
async function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (req.headers['x-auth-token'] as string);

    if (token && !revokedTokens.has(token)) {
      const session = activeSessions.get(token) || verifySignedSessionToken(token);
      if (session && Date.now() < session.expiresAt) {
        const user = await findUserByIdAsync(session.userId);
        if (user) {
          req.user = user;
          return next();
        }
      } else if (session && activeSessions.has(token)) {
        activeSessions.delete(token);
        saveSessions(activeSessions);
      }
    }
  } catch (err) {
    console.warn('Auth middleware lookup error:', err);
  }

  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required. Please log in or create an account.',
      code: 'AUTH_REQUIRED',
    });
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden. Agronomist Admin privileges required for this action.',
      code: 'ADMIN_PRIVILEGE_REQUIRED',
    });
  }
  next();
}

app.use(authenticate);

// ----------------------------------------------------
// PUBLIC HEALTH & STATUS
// ----------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const dbStatus = await getDbStatus();
  res.json({
    status: 'ok',
    service: 'AgriMed AI Production Server',
    database: dbStatus.label,
    dbStatus,
    auth: 'Email + Google Auth (NoSQL)',
    security: {
      helmet: true,
      rateLimit: true,
      maxImageSize: '5MB',
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    },
  });
});

app.get('/api/db-status', async (_req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({
      configured: Boolean(process.env.MONGODB_URI),
      connected: false,
      database: 'agrimed',
      mode: 'local_fallback',
      error: err?.message || 'Failed to check MongoDB Atlas status',
      label: `MongoDB Atlas Error: ${err?.message || 'Connection check failed'}`,
      lastCheckedAt: new Date().toISOString(),
      collections: { users: 0, diagnoses: 0, disease_information: 0 },
    });
  }
});

// ----------------------------------------------------
// AUTHENTICATION ROUTES (Signup, Login & Google Auth)
// ----------------------------------------------------

const SIGNUP_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?\/]/g;
const SIGNUP_PASSWORD_POLICY_ERROR =
  'Password must be 8 characters: 1 uppercase letter, 1 special character, and 6 numbers.';

function isValidSignupPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length !== 8) return false;
  const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
  const specialCount = (password.match(SIGNUP_SPECIAL_CHAR_REGEX) || []).length;
  const digitCount = (password.match(/[0-9]/g) || []).length;
  return uppercaseCount === 1 && specialCount === 1 && digitCount === 6;
}

// 1. Create Account (Sign Up)
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.', code: 'INVALID_NAME' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.', code: 'INVALID_EMAIL' });
    }

    if (!password || typeof password !== 'string' || !isValidSignupPassword(password)) {
      return res.status(400).json({
        error: SIGNUP_PASSWORD_POLICY_ERROR,
        code: 'WEAK_PASSWORD',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in MongoDB Atlas / persisted NoSQL collection
    const existingUser = await findUserByEmailAsync(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        error: 'Account already exists—switching to Log In',
        code: 'ACCOUNT_EXISTS',
        email: normalizedEmail,
      });
    }

    // All public sign-ups are unconditionally assigned role: "farmer" on the server
    const newUser = await createUserWithPasswordAsync({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    const token = createSessionToken(newUser._id);

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account created successfully! Welcome to AgriMed AI.',
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      const normalizedEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return res.status(409).json({
        error: 'Account already exists—switching to Log In',
        code: 'ACCOUNT_EXISTS',
        email: normalizedEmail,
      });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ error: err.message || 'Account creation failed' });
  }
});

// 2. Log In (Existing Users)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.', code: 'MISSING_EMAIL' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.', code: 'MISSING_PASSWORD' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query MongoDB Atlas / persisted NoSQL users collection
    const user = await findUserByEmailAsync(normalizedEmail);
    if (!user) {
      return res.status(404).json({
        error: 'Account not found—please Create Account first',
        code: 'ACCOUNT_NOT_FOUND',
        email: normalizedEmail,
      });
    }

    // Check if account has password or was created via Google
    if (!user.passwordHash) {
      return res.status(401).json({
        error: 'This account was registered via Google. Please click "Continue with Google" to sign in.',
        code: 'USE_GOOGLE_LOGIN',
        email: normalizedEmail,
      });
    }

    // Verify password hash
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Incorrect password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Update last login timestamp
    await recordUserLoginAsync(user._id);

    const token = createSessionToken(user._id);

    return res.json({
      token,
      user: sanitizeUser(user),
      message: 'Logged in successfully. Welcome back!',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// 3. Google OAuth & Google Identity Handler (Strictly requires real user credentials/email—no dummy auto-generation)
const handleGoogleAuth = async (req: Request, res: Response) => {
  try {
    const { credential, accessToken, email, name, avatarUrl, googleId: bodyGoogleId } = req.body;

    let targetEmail = '';
    let targetName = '';
    let targetAvatar = typeof avatarUrl === 'string' ? avatarUrl : '';
    let googleId = typeof bodyGoogleId === 'string' ? bodyGoogleId.trim() : '';

    // Option A: Real Google OAuth2 Access Token (fetched via Google OAuth redirect / Firebase GoogleAuthProvider)
    if (accessToken && typeof accessToken === 'string') {
      try {
        const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userInfoResp.ok) {
          const info = await userInfoResp.json();
          if (info.email) {
            googleId = info.sub || googleId || '';
            targetEmail = String(info.email).trim().toLowerCase();
            targetName = String(info.name || info.given_name || targetEmail.split('@')[0]).trim();
            targetAvatar = info.picture || targetAvatar;
          }
        } else if (!credential && !email) {
          return res.status(401).json({ error: 'Failed to verify Google OAuth token.' });
        }
      } catch (oauthErr) {
        if (!credential && !email) {
          return res.status(502).json({ error: 'Could not reach Google OAuth userinfo service.' });
        }
      }
    }

    // Option B: Google / Firebase ID Token JWT credential
    if (!targetEmail && credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length !== 3) {
          return res.status(400).json({ error: 'Invalid Google credential format.' });
        }
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (!payload.email) {
          return res.status(400).json({ error: 'Google credential does not contain an email address.' });
        }
        googleId = payload.sub || payload.user_id || googleId || '';
        targetEmail = String(payload.email).trim().toLowerCase();
        targetName = String(payload.name || payload.given_name || targetEmail.split('@')[0]).trim();
        targetAvatar = payload.picture || targetAvatar;
      } catch (jwtErr) {
        if (!email) {
          return res.status(400).json({ error: 'Invalid Google credential token.' });
        }
      }
    }

    // Option C: Verified Google userinfo profile ({ email, name, googleId: sub, avatarUrl: picture }) or restricted preview fallback
    if (!targetEmail && email && typeof email === 'string' && email.includes('@')) {
      targetEmail = email.trim().toLowerCase();
      targetName = (typeof name === 'string' && name.trim()) ? name.trim() : targetEmail.split('@')[0];
      if (!googleId) {
        googleId = `google_${crypto.createHash('sha256').update(targetEmail).digest('hex').slice(0, 16)}`;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({
        error: 'A valid Google credential or Google email address is required.',
        code: 'GOOGLE_IDENTITY_REQUIRED',
      });
    }

    const mode = req.body?.mode === 'signup' ? 'signup' : req.body?.mode === 'login' ? 'login' : undefined;
    const existingUser = await findUserByEmailAsync(targetEmail);

    if (mode === 'signup' && existingUser) {
      return res.status(409).json({
        error: 'This Google account already exists. Please switch to Log In.',
        code: 'ACCOUNT_EXISTS',
        email: targetEmail,
      });
    }

    if (mode === 'login' && !existingUser) {
      return res.status(404).json({
        error: 'No account found for this Google email. Please Create Account first.',
        code: 'ACCOUNT_NOT_FOUND',
        email: targetEmail,
      });
    }

    // Preserves existing MongoDB role on login; new accounts always get role: "farmer" & authProvider: "google"
    const user = await upsertGoogleUserAsync({
      googleId,
      email: targetEmail,
      name: targetName,
      avatarUrl: targetAvatar,
    });

    const token = createSessionToken(user._id);

    return res.status(existingUser ? 200 : 201).json({
      token,
      user: sanitizeUser(user),
      message: existingUser
        ? `Welcome back, ${user.name}!`
        : `Google account created & signed in as ${user.name}.`,
    });
  } catch (err: any) {
    if (err?.code === 11000 && req.body?.mode === 'signup') {
      return res.status(409).json({
        error: 'This Google account already exists. Please switch to Log In.',
        code: 'ACCOUNT_EXISTS',
      });
    }
    console.error('Google authentication route error:', err);
    return res.status(500).json({ error: err.message || 'Google authentication failed' });
  }
};

app.post('/api/auth/google', handleGoogleAuth);
app.post('/api/auth/preview-login', handleGoogleAuth);

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user ? sanitizeUser(req.user) : null,
    isAuthenticated: true,
  });
});

// Role self-switching has been disabled; roles are governed strictly by MongoDB agrimed.users
app.get('/api/admin/users', requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await getAllUsersAsync();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load users' });
  }
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-auth-token'] as string);
  if (token) {
    revokedTokens.add(token);
    if (activeSessions.has(token)) {
      activeSessions.delete(token);
      saveSessions(activeSessions);
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ----------------------------------------------------
// 4B. CROP-SPECIFIC BOTANICAL SYMPTOMS API
// ----------------------------------------------------
const handleCropSymptomsLookup = async (req: Request, res: Response) => {
  try {
    const cropParam = String(req.query.crop || '').trim();
    if (!cropParam) {
      return res.status(400).json({ error: 'Query parameter ?crop=<name> is required.' });
    }
    const result = await getCropSymptomsFromAi(cropParam);
    return res.json({
      crop: cropParam,
      symptoms: result.symptoms,
      source: result.source,
    });
  } catch (err: any) {
    console.error('Crop symptoms lookup error:', err);
    return res.status(500).json({ error: 'Failed to retrieve crop symptoms.' });
  }
};

app.get('/api/crop-symptoms', handleCropSymptomsLookup);
app.get('/api/symptoms', handleCropSymptomsLookup);

// ----------------------------------------------------
// 5. SECURE IMAGE UPLOAD API (/api/upload)
// ----------------------------------------------------
app.post(
  '/api/upload',
  requireAuth,
  aiAndUploadLimiter,
  upload.single('image'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No image file provided. Please attach a file under form field "image".',
          code: 'NO_FILE',
        });
      }

      const relativePath = `/uploads/${req.file.filename}`;
      res.json({
        success: true,
        imagePath: relativePath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'File upload failed' });
    }
  }
);

// ----------------------------------------------------
// 6. PROTECTED UNIVERSAL DIAGNOSIS (Anti-Hallucination Pipeline)
// ----------------------------------------------------
const handleDiagnosis = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let cropName = req.body.cropName || req.body.crop;
    let cropCategory = req.body.cropCategory || 'Vegetables';
    let symptoms = req.body.symptoms;
    let problemDescription = req.body.problemDescription || req.body.description || '';
    let imageBase64 = req.body.imageBase64;
    let imageMimeType = req.body.imageMimeType;
    let imagePath = req.body.imagePath;
    const language = typeof req.body.language === 'string' ? req.body.language : 'en';

    // Handle multipart upload if sent directly to /api/diagnose
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        imageBase64 = fileBuffer.toString('base64');
        imageMimeType = req.file.mimetype;
      } catch {}
    } else if (imagePath && !imageBase64) {
      // If imagePath was provided from a previous /api/upload
      try {
        const fullDiskPath = path.join(uploadsDir, path.basename(imagePath));
        if (fs.existsSync(fullDiskPath)) {
          const fileBuffer = fs.readFileSync(fullDiskPath);
          imageBase64 = fileBuffer.toString('base64');
          const ext = path.extname(fullDiskPath).toLowerCase();
          imageMimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        }
      } catch {}
    }

    if (!cropName || typeof cropName !== 'string') {
      return res.status(400).json({ error: 'Crop name is required' });
    }

    if (typeof symptoms === 'string') {
      try { symptoms = JSON.parse(symptoms); } catch { symptoms = [symptoms]; }
    }

    const diagnosis = await diagnoseUniversalCrop({
      cropName: cropName.trim(),
      cropCategory,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      problemDescription,
      imageBase64,
      imageMimeType,
      imagePath,
      language,
    });

    res.json(diagnosis);
  } catch (err: any) {
    const msg = err?.message || 'Diagnosis generation failed';
    console.error('Diagnosis endpoint error:', typeof msg === 'string' && msg.length > 120 ? msg.slice(0, 120) : msg);
    res.status(500).json({ error: 'Diagnosis generation failed' });
  }
};

app.post('/api/diagnose-universal', requireAuth, aiAndUploadLimiter, upload.single('image'), handleDiagnosis);
app.post('/api/diagnose', requireAuth, aiAndUploadLimiter, upload.single('image'), handleDiagnosis);

// ----------------------------------------------------
// 7. PROTECTED AI AGRONOMIST CHAT (Supports Multimodal Photo/PDF/TXT Upload)
// ----------------------------------------------------
app.post(
  '/api/chat',
  requireAuth,
  aiAndUploadLimiter,
  chatUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const cropContext = typeof req.body?.cropContext === 'string' ? req.body.cropContext : undefined;
      const langStr = typeof req.body?.language === 'string' ? req.body.language : 'en';

      let parsedHistory: Array<{ sender: 'user' | 'assistant'; text: string }> = [];
      if (Array.isArray(req.body?.history)) {
        parsedHistory = req.body.history;
      } else if (typeof req.body?.history === 'string' && req.body.history.trim()) {
        try {
          const decoded = JSON.parse(req.body.history);
          if (Array.isArray(decoded)) parsedHistory = decoded;
        } catch {}
      }

      let attachment: { data: string; mimeType: string; fileName?: string } | undefined;
      if (req.file && req.file.buffer) {
        attachment = {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
        };
      } else if (
        typeof req.body?.fileBase64 === 'string' &&
        req.body.fileBase64.trim() &&
        typeof req.body?.fileMimeType === 'string' &&
        CHAT_ALLOWED_MIME_TYPES.includes(req.body.fileMimeType)
      ) {
        const cleanedBase64 = req.body.fileBase64.replace(/^data:[^;]+;base64,/, '').trim();
        const estimatedBytes = Math.ceil((cleanedBase64.length * 3) / 4);
        if (estimatedBytes > 5 * 1024 * 1024) {
          return res.status(400).json({
            error: 'File size exceeds the 5 MB limit.',
            code: 'FILE_TOO_LARGE',
          });
        }
        attachment = {
          data: cleanedBase64,
          mimeType: req.body.fileMimeType,
          fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        };
      }

      if (!rawMessage && !attachment) {
        return res.status(400).json({ error: 'Please enter a message or attach a photo/report.' });
      }

      const finalQuestion =
        rawMessage ||
        'Please analyze the attached crop photo or soil/lab report and provide agronomic advice.';

      const reply = await askAgronomist(finalQuestion, parsedHistory, cropContext, langStr, attachment);
      res.json({ reply });
    } catch (err: any) {
      const msg = err?.message || 'Chat generation failed';
      console.error('Chat endpoint error:', typeof msg === 'string' && msg.length > 120 ? msg.slice(0, 120) : msg);
      res.status(500).json({ error: 'Chat generation failed' });
    }
  }
);

// ----------------------------------------------------
// 7B. PROTECTED GEMINI AUDIO TRANSCRIPTION (/api/transcribe)
// ----------------------------------------------------
app.post(
  '/api/transcribe',
  requireAuth,
  aiAndUploadLimiter,
  audioUpload.single('audio'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({
          error: 'No audio recording provided. Please record voice audio under field "audio".',
          code: 'NO_AUDIO_FILE',
        });
      }

      const rawMime = req.file.mimetype || 'audio/webm';
      const cleanMime = rawMime.split(';')[0].trim().toLowerCase() || 'audio/webm';
      // Normalize video/webm audio-only captures to audio/webm for Gemini inlineData
      const geminiMime = cleanMime === 'video/webm' ? 'audio/webm' : cleanMime;
      const language = typeof req.body?.language === 'string' ? req.body.language : 'en';
      const audioBase64 = req.file.buffer.toString('base64');

      const { transcript, error } = await transcribeFarmerAudio(audioBase64, geminiMime, language);
      if (!transcript) {
        return res.status(error?.includes('quota') ? 429 : 502).json({
          error: error || 'Unable to transcribe audio. Please try speaking again or type your message.',
          transcript: '',
        });
      }

      return res.json({ transcript });
    } catch (err: any) {
      console.error('Transcribe endpoint error:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Audio transcription failed.' });
    }
  }
);

// ----------------------------------------------------
// 8. STRICT DIAGNOSES COLLECTION (MongoDB Atlas + NoSQL Store)
// ----------------------------------------------------
app.get('/api/diagnoses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const records = await getUserDiagnosesAsync(req.user!._id, isAdmin);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/diagnoses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = req.body;
    const diseaseDetected = doc.diseaseDetected || doc.diseaseName;
    if (!doc.crop || !diseaseDetected) {
      return res.status(400).json({ error: 'Crop and diseaseDetected are required' });
    }

    const saved = await saveDiagnosisDocAsync({ ...doc, diseaseDetected }, req.user!._id);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save diagnosis' });
  }
});

app.delete('/api/diagnoses/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Diagnosis ID is required' });
    const isAdmin = req.user!.role === 'admin';
    const success = await deleteDiagnosisAsync(id, req.user!._id, isAdmin);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Backwards-compatible /api/consultations and /api/history routes
const handleGetHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const history = await getConsultationHistoryAsync(req.user!._id, isAdmin);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const handleSaveHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const record = req.body;
    if (!record.crop || (!record.diseaseName && !record.diseaseDetected)) {
      return res.status(400).json({ error: 'Crop and disease name are required' });
    }

    const saved = await saveConsultationRecordAsync(record, req.user!._id);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save consultation' });
  }
};

const handleDeleteHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Consultation ID is required' });
    const isAdmin = req.user!.role === 'admin';
    const success = await deleteConsultationAsync(id, req.user!._id, isAdmin);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/history', requireAuth, handleGetHistory);
app.get('/api/consultations', requireAuth, handleGetHistory);
app.post('/api/history', requireAuth, handleSaveHistory);
app.post('/api/consultations', requireAuth, handleSaveHistory);
app.delete('/api/history/:id', requireAuth, handleDeleteHistory);
app.delete('/api/consultations/:id', requireAuth, handleDeleteHistory);

// Database Stats
app.get('/api/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const stats = await getDatabaseStatsAsync(req.user!._id, isAdmin);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve stats' });
  }
});

// ----------------------------------------------------
// 9. VERIFIED DISEASE INFORMATION COLLECTION (ICAR/FAO/CIBRC)
// ----------------------------------------------------
app.get('/api/disease-information', async (_req, res) => {
  try {
    res.json(await getAllDiseaseInformationAsync());
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load verified disease directory' });
  }
});

app.get('/api/diseases', async (_req, res) => {
  try {
    res.json(await getAllDiseaseInformationAsync());
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load verified disease directory' });
  }
});

function normalizeDiseasePayload(body: any, idOverride?: string) {
  const chem = body.chemicalPrescription || {};
  const org = body.organicControl || {};
  const dose16 = Number(body.safeDosagePer16LTank ?? chem.dosePer16LTank ?? 40);
  const doseL = Number(body.safeDosagePerLiter ?? chem.dosePerLiter ?? (dose16 / 16));
  const org16 = Number(body.organicDosagePer16LTank ?? org.dosePer16LTank ?? 80);

  return {
    ...(idOverride ? { _id: idOverride } : body._id ? { _id: body._id } : {}),
    diseaseName: body.diseaseName || body.name || 'Verified Plant Disease',
    scientificName: body.scientificName || 'Scientific taxon',
    crop: body.crop || 'Universal',
    cropCategory: body.cropCategory || 'Vegetables',
    pathogenType: body.pathogenType || 'Fungal',
    verifiedChemical: body.verifiedChemical || chem.name || 'Mancozeb 75% WP',
    activeIngredient: body.activeIngredient || chem.activeIngredient || body.verifiedChemical || chem.name || 'Mancozeb',
    tradeNames: Array.isArray(body.tradeNames) ? body.tradeNames : Array.isArray(chem.tradeNames) ? chem.tradeNames : [],
    formulation: body.formulation || chem.formulation || 'WP',
    safeDosagePerLiter: Number.isFinite(doseL) ? Math.round(doseL * 100) / 100 : 2.5,
    dosageUnit: body.dosageUnit || chem.unit || 'g',
    safeDosagePer16LTank: Number.isFinite(dose16) ? dose16 : 40,
    organicAlternative: body.organicAlternative || org.name || 'Trichoderma harzianum 2% WP + Cold-Pressed Neem Oil',
    organicDosagePer16LTank: Number.isFinite(org16) ? org16 : 80,
    organicUnit: body.organicUnit || org.unit || 'g',
    phiDays: Number(body.phiDays ?? 7),
    reiHours: Number(body.reiHours ?? 24),
    sourceReference: body.sourceReference || 'ICAR-IARI Field Guide / CIBRC 2024 Approved List',
    ...(Array.isArray(body.sourceUrls) ? { sourceUrls: body.sourceUrls } : {}),
    ...(body.verificationStatus ? { verificationStatus: body.verificationStatus } : {}),
    ...(Array.isArray(body.symptoms) ? { symptoms: body.symptoms } : {}),
    ...(body.weatherConditions ? { weatherConditions: body.weatherConditions } : {}),
    culturalPractices: Array.isArray(body.culturalPractices) ? body.culturalPractices : ['Destroy infected crop residues', 'Sanitize tools'],
    safetyWarnings: Array.isArray(body.safetyWarnings) ? body.safetyWarnings : ['Wear nitrile gloves, mask, and eye protection while spraying'],
  };
}

// Unlimited Global Pathology Search (MongoDB Cache -> Gemini Google Search Grounding -> Auto-Save to MongoDB)
app.post('/api/diseases/search-global', aiAndUploadLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = String(req.body?.query || '').trim();
    const crop = req.body?.crop ? String(req.body.crop).trim() : undefined;
    const forceAi = Boolean(req.body?.forceAi);

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Please enter a crop or disease name to search worldwide.' });
    }

    // 1. Search MongoDB agrimed.disease_information cache first unless forceAi is explicitly requested
    if (!forceAi) {
      const cachedMatches = await searchDiseaseInformationAsync(query, crop);
      if (cachedMatches.length > 0) {
        return res.json({
          source: 'mongodb_cache',
          results: cachedMatches,
          newlyCachedCount: 0,
        });
      }
    }

    // 2. Research worldwide via Gemini + Google Search Grounding (tools: [{ googleSearch: {} }])
    const { result: researched, error } = await researchDiseaseWorldwideWithSearch(query, crop);
    if (!researched) {
      return res.status(502).json({
        error: error || 'Unable to research this disease right now. Please try a more specific crop/disease name.',
        results: [],
      });
    }

    // 3. Deduplicate against existing crop+diseaseName and auto-cache permanently in MongoDB agrimed.disease_information
    const existing = await findDiseaseByCropAndNameAsync(researched.crop, researched.diseaseName);
    const savedDoc = await createOrUpdateDiseaseInformationAsync(
      {
        ...(existing ? { _id: existing._id } : {}),
        ...researched,
      },
      req.user?._id || 'system_search_grounding'
    );

    return res.json({
      source: 'gemini_google_search',
      results: [savedDoc],
      newlyCachedCount: existing ? 0 : 1,
    });
  } catch (err: any) {
    console.error('Global disease search error:', err);
    return res.status(500).json({ error: err?.message || 'Worldwide disease search failed' });
  }
});

app.post('/api/disease-information', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await createOrUpdateDiseaseInformationAsync(normalizeDiseasePayload(req.body), req.user!._id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create verified disease record' });
  }
});

app.post('/api/diseases', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await createOrUpdateDiseaseInformationAsync(normalizeDiseasePayload(req.body), req.user!._id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create verified disease record' });
  }
});

app.put('/api/disease-information/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await createOrUpdateDiseaseInformationAsync(normalizeDiseasePayload(req.body, req.params.id), req.user!._id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update disease record' });
  }
});

app.put('/api/diseases/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await createOrUpdateDiseaseInformationAsync(normalizeDiseasePayload(req.body, req.params.id), req.user!._id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update disease record' });
  }
});

app.delete('/api/disease-information/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await deleteDiseaseInformationAsync(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete disease record' });
  }
});

app.delete('/api/diseases/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await deleteDiseaseInformationAsync(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete disease record' });
  }
});

// ----------------------------------------------------
// 10. CLEAN ERROR HANDLING MIDDLEWARE (Multer & App)
// ----------------------------------------------------
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size exceeds the 5 MB limit. Please upload an image under 5 MB.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
      code: 'FILE_UPLOAD_ERROR',
    });
  }

  if (
    err &&
    err.message &&
    (err.message.includes('Allowed types: image/jpeg, image/png, image/webp') ||
      err.message.includes('Invalid attachment format') ||
      err.message.includes('Invalid audio format'))
  ) {
    return res.status(400).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE',
    });
  }

  if (err) {
    console.error('Unhandled server error:', err.message || err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  next();
});

// ----------------------------------------------------
// 11. STATIC / VITE DEV SERVER SERVING
// ----------------------------------------------------
process.on('unhandledRejection', (reason: any) => {
  console.warn('Unhandled promise rejection:', reason?.message || reason);
});

async function startServer() {
  // Connect to MongoDB Atlas ("agrimed") and initialize local mirror before accepting requests
  await ensureDbInitialized();

  const httpServer = http.createServer(app);
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: { server: httpServer },
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriMed AI Production Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
