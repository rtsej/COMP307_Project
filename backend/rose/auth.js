import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import { sendApiError } from './lib/apiError.js';

const deriveKey = promisify(scrypt);
const dummySalt = randomBytes(16).toString('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashLength = 64;

function publicUser(user) {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
  };
}

function validCredentials(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const { email, password } = body;
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !emailPattern.test(email.trim()) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null;
  }

  return { email: email.trim().toLowerCase(), password };
}

function validPasswordHash(value) {
  return typeof value === 'string' && /^[a-f\d]{128}$/i.test(value);
}

function validSalt(value) {
  return typeof value === 'string' && /^[a-f\d]{32}$/i.test(value);
}

export function authRoutes(db, { requireAuth, startSession, endSession }) {
  if (!db || typeof db.collection !== 'function') {
    throw new Error('authRoutes requires the shared MongoDB database.');
  }
  if (
    typeof requireAuth !== 'function' ||
    typeof startSession !== 'function' ||
    typeof endSession !== 'function'
  ) {
    throw new Error('authRoutes requires the sessionAuth handlers.');
  }

  const router = Router();
  const users = db.collection('users');

  router.post('/register', async (req, res) => {
    const credentials = validCredentials(req.body);
    const name = req.body?.name;
    if (
      !credentials ||
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 120
    ) {
      return sendApiError(
        res,
        400,
        'VALIDATION_ERROR',
        'Enter a name, valid email, and password of 8 to 128 characters.'
      );
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = (
      await deriveKey(credentials.password, salt, hashLength)
    ).toString('hex');
    const user = {
      name: name.trim(),
      email: credentials.email,
      salt,
      passwordHash,
    };

    try {
      const { insertedId } = await users.insertOne(user);
      user._id = insertedId;
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
      return sendApiError(res, 409, 'EMAIL_IN_USE', 'An account already uses that email.');
    }

    await startSession(req, res, user._id);
    return res.status(201).json({ user: publicUser(user) });
  });

  router.post('/login', async (req, res) => {
    const credentials = validCredentials(req.body);
    if (!credentials) {
      return sendApiError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const user = await users.findOne({ email: credentials.email });
    const hasValidSalt = validSalt(user?.salt);
    const salt = hasValidSalt ? user.salt : dummySalt;
    const derivedKey = await deriveKey(credentials.password, salt, hashLength);
    const expectedHash = validPasswordHash(user?.passwordHash)
      ? Buffer.from(user.passwordHash, 'hex')
      : Buffer.alloc(hashLength);
    const passwordMatches = timingSafeEqual(derivedKey, expectedHash);

    if (
      !user ||
      !hasValidSalt ||
      !validPasswordHash(user.passwordHash) ||
      !passwordMatches
    ) {
      return sendApiError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    await startSession(req, res, user._id);
    return res.json({ user: publicUser(user) });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await users.findOne({ _id: req.userId });
    if (!user) {
      await endSession(req, res);
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Please sign in.');
    }
    return res.json({ user: publicUser(user) });
  });

  router.post('/logout', async (req, res) => {
    await endSession(req, res);
    return res.status(204).end();
  });

  return router;
}
