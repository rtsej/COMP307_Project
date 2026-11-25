import { createHash, randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';

const cookieName = 'mcgillaccess_rose_session';
const sessionDuration = 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
};

function readSessionToken(req) {
  const prefix = `${cookieName}=`;
  const cookie = (req.headers.cookie ?? '')
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  const token = cookie?.slice(prefix.length);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function digestToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionAuth(db) {
  if (!db || typeof db.collection !== 'function') {
    throw new Error('sessionAuth requires the shared MongoDB database.');
  }

  const sessions = db.collection('sessions');

  async function requireAuth(req, res, next) {
    const token = readSessionToken(req);
    const session = token
      ? await sessions.findOne({
          _id: digestToken(token),
          expiresAt: { $gt: new Date() },
        })
      : null;

    if (!session) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Please sign in.' },
      });
    }

    req.userId = session.userId;
    return next();
  }

  async function startSession(req, res, userId) {
    const previousToken = readSessionToken(req);
    if (previousToken) {
      await sessions.deleteOne({ _id: digestToken(previousToken) });
    }

    const token = randomBytes(32).toString('base64url');
    await sessions.insertOne({
      _id: digestToken(token),
      userId: new ObjectId(userId),
      expiresAt: new Date(Date.now() + sessionDuration),
    });

    res.cookie(cookieName, token, {
      ...cookieOptions,
      maxAge: sessionDuration,
    });
  }

  async function endSession(req, res) {
    const token = readSessionToken(req);
    if (token) {
      await sessions.deleteOne({ _id: digestToken(token) });
    }
    res.clearCookie(cookieName, cookieOptions);
  }

  return { requireAuth, startSession, endSession };
}
