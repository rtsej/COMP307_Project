import { MongoClient } from 'mongodb';

const buildings = [
  { name: 'McLennan Library', address: '3459 McTavish Street', latitude: 45.5033, longitude: -73.5760 },
  { name: 'Redpath Library', address: '3459 McTavish Street', latitude: 45.50383233, longitude: -73.57742633 },
  { name: 'University Centre', address: '3480 McTavish Street', latitude: 45.50355653, longitude: -73.57814397 },
];

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017', {
  serverSelectionTimeoutMS: 5000,
});

try {
  const db = client.db(process.env.MONGODB_DB ?? 'mcgillaccess');
  const result = await db.collection('locations').bulkWrite(buildings.map(building => ({
    updateOne: {
      filter: { name: building.name, address: building.address },
      update: { $setOnInsert: building },
      upsert: true,
    },
  })));
  console.log(`Added ${result.upsertedCount} campus locations. ${result.matchedCount} already existed.`);
} catch (error) {
  console.error('Could not seed locations:', error.name);
  process.exitCode = 1;
} finally {
  await client.close();
}
