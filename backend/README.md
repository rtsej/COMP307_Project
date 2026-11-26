# McGillAccess backend

From this directory, run `npm ci` with Node.js 22 or newer and configure MongoDB.
Run `npm run seed` to add the three starter buildings, then `npm start`.
Express serves the frontend from `../public` and the API from `/api`.

The seed command can be run again without duplicating its existing locations.
It adds building pins without creating student reports. Pin coordinates are
approximate. Building sources: [McLennan](https://www.mcgill.ca/undergraduate-admissions/mclennan-library-building),
[Redpath](https://digital.library.mcgill.ca/campus/items/cb006.html),
and [University Centre](https://digital.library.mcgill.ca/campus/items/cb013.html).
See [MongoDB schema](SCHEMA.md) for collections, indexes, and field types.
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

The app uses the session middleware and report routes under `backend/rose/`.
The middleware sets `req.userId` to the authenticated user's MongoDB ObjectId.
Sign in through the same origin as the API so the browser sends the session cookie.

| Auth route | Contract |
| --- | --- |
| `POST /api/auth/register` | Accepts `{ name, email, password }`. Returns `201 { user }` and sets the session cookie. |
| `POST /api/auth/login` | Accepts `{ email, password }`. Returns `200 { user }` and sets the session cookie. |
| `GET /api/auth/me` | Returns `{ user }` or `401`. |
| `POST /api/auth/logout` | Revokes the session and returns `204`. |

Sessions expire after 24 hours. Set `NODE_ENV=production` when serving over
HTTPS so the browser only sends the session cookie over HTTPS.

My Contributions uses `GET /api/me/reports`, `PATCH /api/reports/:id`
and `DELETE /api/reports/:id`. The same report form handles creation and editing.

On the shared COMP 307 server, use the MongoDB URI, port, and HTTPS routing
provided by SOCS IT. Keep the matching source checkout accessible to the TA
and put the verified HTTPS URL in the final submission README.

The initial backend scaffold and v1 integration fixes were drafted with Codex assistance.
