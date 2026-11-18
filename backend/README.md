# McGillAccess backend

From this directory, run `npm ci` and `npm start` with Node.js 22 or newer.
The server binds to localhost. Set `MONGODB_URI`, `MONGODB_DB`, or `PORT`
in a local `.env` file as needed. Defaults are local MongoDB, the
`mcgillaccess` database, and port `3000`.

| Route | Contract |
| --- | --- |
| `GET /api/locations?q=library&feature=stepFreeEntrance&feature=elevator` | Returns `{ locations }` and matches all selected features. Both parameters are optional. |
| `GET /api/locations/:id` | Returns `{ location }`. |
| `POST /api/locations` | Accepts `{ name, address, latitude, longitude }` and returns `201 { location }`. Coordinates are JSON numbers. |

Each location has `id`, `name`, `address`, `latitude`, `longitude`, `accessibility`,
and `lastReportedOn` (YYYY-MM-DD or null). The accessibility keys are
`stepFreeEntrance`, `elevator`, `accessibleBathroom`, and `automaticDoors`.
Each is `available` when a saved report checks that feature, or `unknown` otherwise.

For Rose's integration, reports store `locationId` as a MongoDB ObjectId, `features`
as an array of the keys above, and `observedOn` as a YYYY-MM-DD string.
Wire the session middleware into `createApp(db, requireAuth)` and mount the auth
and report routes before the API fallback. Location endpoints currently return
401 until the session middleware is connected.

For Jad, the Add Location form needs coordinates as well as the building's
name and address. The frontend can use the same JSON shape for mock data and
later switch to the real endpoints.

This initial backend scaffold was drafted with Codex assistance.
