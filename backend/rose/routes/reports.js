import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { sendApiError } from '../lib/apiError.js';

const REPORT_FEATURES = new Set([
  'stepFreeEntrance',
  'elevator',
  'accessibleBathroom',
  'automaticDoors',
]);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseReportInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A JSON request body is required.' };
  }
  if (!validDate(body.observedOn)) {
    return { error: 'observedOn must be a valid YYYY-MM-DD date.' };
  }
  if (
    !Array.isArray(body.features) ||
    body.features.some(
      feature => typeof feature !== 'string' || !REPORT_FEATURES.has(feature)
    )
  ) {
    return { error: 'features must be an array of supported checked feature keys.' };
  }
  if (body.comments !== undefined && typeof body.comments !== 'string') {
    return { error: 'comments must be a string.' };
  }
  const comments = (body.comments || '').trim();
  if (comments.length > 5000) {
    return { error: 'comments must be 5000 characters or fewer.' };
  }

  return {
    value: {
      observedOn: body.observedOn,
      features: [...new Set(body.features)],
      comments,
    },
  };
}

function publicReport(report) {
  return {
    id: report._id.toHexString(),
    locationId: report.locationId.toHexString(),
    locationName: report.locationName,
    observedOn: report.observedOn,
    features: report.features,
    comments: report.comments,
  };
}

function validObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function invalidId(res, recordType) {
  return sendApiError(res, 400, 'VALIDATION_ERROR', `Use a valid ${recordType} ID.`);
}

export function reportRoutes(db, requireAuth) {
  if (!db || typeof db.collection !== 'function') {
    throw new Error('reportRoutes requires the shared MongoDB database.');
  }
  if (typeof requireAuth !== 'function') {
    throw new Error('reportRoutes requires the shared session authentication middleware.');
  }

  const router = Router();
  const reports = db.collection('reports');
  const locations = db.collection('locations');
  router.use(requireAuth);

  router.get('/locations/:id/reports', async (req, res) => {
    if (!validObjectId(req.params.id)) {
      return invalidId(res, 'location');
    }

    const locationId = new ObjectId(req.params.id);
    const location = await locations.findOne({ _id: locationId }, { projection: { _id: 1 } });
    if (!location) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Location not found.');
    }

    const items = await reports.find({ locationId }).sort({
      observedOn: -1,
      createdAt: -1,
      _id: -1,
    }).toArray();
    return res.json({ reports: items.map(publicReport) });
  });

  router.get('/me/reports', async (req, res) => {
    const items = await reports.find({ authorId: req.userId }).sort({
      observedOn: -1,
      createdAt: -1,
      _id: -1,
    }).toArray();
    return res.json({ reports: items.map(publicReport) });
  });

  router.post('/locations/:id/reports', async (req, res) => {
    if (!validObjectId(req.params.id)) {
      return invalidId(res, 'location');
    }

    const parsed = parseReportInput(req.body);
    if (parsed.error) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', parsed.error);
    }

    const locationId = new ObjectId(req.params.id);
    const location = await locations.findOne(
      { _id: locationId },
      { projection: { _id: 1, name: 1 } }
    );
    if (!location) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Location not found.');
    }

    const report = {
      ...parsed.value,
      locationId,
      locationName: location.name,
      authorId: req.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { insertedId } = await reports.insertOne(report);
    return res.status(201).json({
      report: publicReport({ ...report, _id: insertedId }),
    });
  });

  router.patch('/reports/:id', async (req, res) => {
    if (!validObjectId(req.params.id)) {
      return invalidId(res, 'report');
    }

    const parsed = parseReportInput(req.body);
    if (parsed.error) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', parsed.error);
    }

    const reportId = new ObjectId(req.params.id);
    const report = await reports.findOne({ _id: reportId });
    if (!report) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
    }
    if (!report.authorId.equals(req.userId)) {
      return sendApiError(res, 403, 'FORBIDDEN', 'You can only edit your own reports.');
    }

    const updateResult = await reports.updateOne(
      { _id: reportId, authorId: req.userId },
      { $set: { ...parsed.value, updatedAt: new Date() } }
    );
    if (updateResult.matchedCount === 0) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
    }

    return res.json({
      report: publicReport({ ...report, ...parsed.value }),
    });
  });

  router.delete('/reports/:id', async (req, res) => {
    if (!validObjectId(req.params.id)) {
      return invalidId(res, 'report');
    }

    const reportId = new ObjectId(req.params.id);
    const report = await reports.findOne({ _id: reportId });
    if (!report) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
    }
    if (!report.authorId.equals(req.userId)) {
      return sendApiError(res, 403, 'FORBIDDEN', 'You can only delete your own reports.');
    }

    const deleteResult = await reports.deleteOne({ _id: reportId, authorId: req.userId });
    if (deleteResult.deletedCount === 0) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Report not found.');
    }
    return res.status(204).end();
  });

  return router;
}
