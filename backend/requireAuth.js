import { createHash, randomBytes } from 'node:crypto';

const cookieName = 'mcgillaccess_session';
const sessionDuration = 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
};

function sessionId(req) {
  const cookies = (req.headers.cookie ?? '').split(';').map(cookie => cookie.trim());
  const token = cookies.find(cookie => cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return createHash('sha256').update(token).digest('hex');
}

export function sessionAuth(db) {
  const sessions = db.collection('sessions');

  async function requireAuth(req, res, next) {
    const id = sessionId(req);
    const session = id && await sessions.findOne({ _id: id, expiresAt: { $gt: new Date() } });
    if (!session) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Please sign in.' } });
    }
    req.userId = session.userId;
    next();
  }

  async function startSession(req, res, userId) {
    const oldId = sessionId(req);
    if (oldId) await sessions.deleteOne({ _id: oldId });

    const token = randomBytes(32).toString('hex');
    await sessions.insertOne({
      _id: createHash('sha256').update(token).digest('hex'),
      userId,
      expiresAt: new Date(Date.now() + sessionDuration),
    });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionDuration });
  }

  async function endSession(req, res) {
    const id = sessionId(req);
    if (id) await sessions.deleteOne({ _id: id });
    res.clearCookie(cookieName, cookieOptions);
  }

  return { requireAuth, startSession, endSession };
}
