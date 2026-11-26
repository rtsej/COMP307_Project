# McGillAccess MongoDB schema

All collections share the database set by `MONGODB_DB`. The active authentication and report code lives under `backend/rose/`.

| Collection | Fields | Indexes created at startup |
| --- | --- | --- |
| `users` | `_id` (ObjectId), `name`, `email` (normalized), `salt`, `passwordHash` (strings) | Unique `email` |
| `sessions` | `_id` (hashed token string), `userId` (ObjectId), `expiresAt` (Date) | TTL on `expiresAt` |
| `locations` | `_id` (ObjectId), `name`, `address` (strings), `latitude`, `longitude` (numbers) | Default `_id` |
| `reports` | `_id`, `locationId`, `authorId` (ObjectIds), `locationName`, `observedOn` (YYYY-MM-DD), `comments` (strings), `features` (string array), `createdAt`, `updatedAt` (Dates) | `locationId` |

A report links to its location through `locationId` and its author through
`authorId`. A session links to its user through `userId`. Public API responses
convert ObjectIds to strings. Location summaries use checked features from saved
reports. Unreported features remain unknown and the latest observation date is
`null` until there is a report.

Supported feature keys are `stepFreeEntrance`, `elevator`,
`accessibleBathroom`, and `automaticDoors`.
