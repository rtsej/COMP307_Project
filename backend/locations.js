// Braden Wei — location routes and accessibility summaries
import { Router } from 'express';
import { ObjectId } from 'mongodb';

const features = ['stepFreeEntrance', 'elevator', 'accessibleBathroom', 'automaticDoors'];

function error(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function formatLocation(location, reports) {
  const observed = new Set(reports.flatMap(report => report.features));
  const dates = reports.map(report => report.observedOn).sort();
  return {
    id: location._id.toHexString(),
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    accessibility: Object.fromEntries(
      features.map(feature => [feature, observed.has(feature) ? 'available' : 'unknown'])
    ),
    lastReportedOn: dates.at(-1) ?? null,
  };
}

// Reports store locationId as an ObjectId. API responses expose it as a string.
export function locationRoutes(db) {
  const router = Router();
  const locations = db.collection('locations');
  const reports = db.collection('reports');

  router.get('/', async (req, res) => {
    const { q = '', feature = [] } = req.query;
    const selected = Array.isArray(feature) ? feature : [feature];
    if (typeof q !== 'string' || q.length > 200 || selected.some(key => !features.includes(key))) {
      return error(res, 400, 'VALIDATION_ERROR', 'Enter a valid search and select supported filters.');
    }

    const search = q.trim().toLowerCase();
    const buildings = (await locations.find().sort({ name: 1, _id: 1 }).toArray())
      .filter(building => [building.name, building.address].some(value => value.toLowerCase().includes(search)));

    const observations = await reports.find(
      { locationId: { $in: buildings.map(building => building._id) } },
      { projection: { locationId: 1, features: 1, observedOn: 1 } }
    ).toArray();

    const reportsByLocation = new Map();
    for (const report of observations) {
      const key = report.locationId.toHexString();
      if (!reportsByLocation.has(key)) reportsByLocation.set(key, []);
      reportsByLocation.get(key).push(report);
    }

    const results = buildings
      .map(building => formatLocation(building, reportsByLocation.get(building._id.toHexString()) ?? []))
      .filter(location => selected.every(key => location.accessibility[key] === 'available'));
    res.json({ locations: results });
  });

  router.get('/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return error(res, 400, 'VALIDATION_ERROR', 'Use a valid location ID.');
    }
    const id = new ObjectId(req.params.id);
    const location = await locations.findOne({ _id: id });
    if (!location) return error(res, 404, 'NOT_FOUND', 'Location not found.');
    const observations = await reports.find(
      { locationId: id }, { projection: { features: 1, observedOn: 1 } }
    ).toArray();
    res.json({ location: formatLocation(location, observations) });
  });

  router.post('/', async (req, res) => {
    const { name, address, latitude, longitude } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || name.length > 120
        || typeof address !== 'string' || !address.trim() || address.length > 240
        || !Number.isFinite(latitude) || Math.abs(latitude) > 90
        || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      return error(res, 400, 'VALIDATION_ERROR', 'Enter a name, address, and valid map coordinates.');
    }
    const location = { name: name.trim(), address: address.trim(), latitude, longitude };
    const { insertedId } = await locations.insertOne(location);
    res.status(201).json({ location: formatLocation({ ...location, _id: insertedId }, []) });
  });

  return router;
}
