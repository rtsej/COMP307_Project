// Braden Wei — MongoDB connection and server startup
import { MongoClient } from 'mongodb';
import { createApp } from './app.js';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017', {
  serverSelectionTimeoutMS: 5000,
});

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? 'mcgillaccess');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('reports').createIndex({ locationId: 1 });
  const port = process.env.PORT ?? '3000';
  createApp(db).listen(Number(port), '127.0.0.1', () => {
    console.log('McGillAccess API listening on port ' + port);
  }).on('error', async error => {
    console.error('Could not start the API:', error.code ?? error.name);
    await client.close();
    process.exitCode = 1;
  });
} catch (error) {
  console.error('Could not initialize MongoDB:', error.name);
  await client.close();
  process.exitCode = 1;
}
