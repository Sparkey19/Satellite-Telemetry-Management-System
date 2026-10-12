# Architecture

The backend is a small layered service: `src/db.ts` owns the SQLite schema,
`src/index.ts` validates requests and maps them to REST resources, and
`src/algorithms.ts` contains reusable analysis primitives. SQLite uses WAL
mode and indexes telemetry by satellite and timestamp.

The eight algorithm demonstrations are:

1. hash map — latest signal values by satellite
2. ring buffer — bounded recent temperature samples
3. min-heap — lowest-battery satellite selection
4. sliding-window statistics — rolling mean and deviation
5. binary search — nearest sorted timestamp/value lookup
6. graph BFS — mission dependency reachability
7. interval index — contact-window overlap queries
8. exponential moving average — smoothed temperature trend

The frontend is a Vite React application with a single mission-control shell
and focused views for overview, fleet, telemetry, missions, and alerts. It
uses the same API contracts as the backend and has a safe offline demo mode.
