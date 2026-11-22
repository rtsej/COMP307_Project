import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';

const deriveKey = promisify(scrypt);
const dummySalt = randomBytes(16).toString('hex');

function publicUser(user) {
  return { id: user._id.toHexString(), name: user.name, email: user.email };
}

function credentials(body) {
  const { email, password } = body ?? {};
  if (typeof email !== 'string' || email.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return null;
  }
  return { email: email.trim().toLowerCase(), password };
}

function error(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

export function authRoutes(db, { requireAuth, startSession, endSession }) {
  const router = Router();
  const users = db.collection('users');

  router.post('/register', async (req, res) => {
    const input = credentials(req.body);
    const name = req.body?.name;
    if (!input || typeof name !== 'string' || !name.trim() || name.length > 120) {
      return error(res, 400, 'VALIDATION_ERROR', 'Enter a name, valid email, and password of 8 to 128 characters.');
    }
    const salt = randomBytes(16).toString('hex');
    const key = await deriveKey(input.password, salt, 64);
    const user = { name: name.trim(), email: input.email, salt, passwordHash: key.toString('hex') };
    try {
      const { insertedId } = await users.insertOne(user);
      user._id = insertedId;
    } catch (err) {
      if (err.code !== 11000) throw err;
      return error(res, 409, 'EMAIL_IN_USE', 'An account already uses that email.');
    }

    await startSession(req, res, user._id);
    res.status(201).json({ user: publicUser(user) });
  });

  router.post('/login', async (req, res) => {
    const input = credentials(req.body);
    if (!input) return error(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    const user = await users.findOne({ email: input.email });
    // Do the same password-hashing work even when the account does not exist.
    const key = await deriveKey(input.password, user?.salt ?? dummySalt, 64);
    if (!user || !timingSafeEqual(key, Buffer.from(user.passwordHash, 'hex'))) {
      return error(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    await startSession(req, res, user._id);
    res.json({ user: publicUser(user) });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await users.findOne({ _id: req.userId });
    if (!user) return error(res, 401, 'UNAUTHORIZED', 'Please sign in.');
    res.json({ user: publicUser(user) });
  });

  router.post('/logout', async (req, res) => {
    await endSession(req, res);
    res.sendStatus(204);
  });

  return router;
}
