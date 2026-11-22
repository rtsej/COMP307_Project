// Braden Wei — Express application setup
import express from 'express';
import { locationRoutes } from './locations.js';

import { authRoutes } from './auth.js';
import { sessionAuth } from './requireAuth.js';

export function createApp(db) {
  const app = express();
  const auth = sessionAuth(db);

  app.use(express.json({ limit: '32kb' }));
  app.use('/api/auth', authRoutes(db, auth));
  app.use('/api/locations', auth.requireAuth, locationRoutes(db));
  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Send valid JSON.' } });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'REQUEST_TOO_LARGE', message: 'Request is too large.' } });
    }
    console.error(err.name);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
  });
  return app;
}
