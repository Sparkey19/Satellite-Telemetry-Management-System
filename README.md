# Satellite Telemetry Management System

Mission-control software for registering satellites, ingesting telemetry,
planning missions, monitoring alerts, and inspecting operational analytics.
The system is intentionally self-contained: SQLite stores durable state, an
Express API exposes the operations, and a React/Vite console provides the
operator experience.

## Quick start

Requirements: Node.js 22.5+ (the backend uses the built-in `node:sqlite`),
npm, and optionally a C11 compiler for the references.

```bash
npm install
npm --prefix frontend install
npm run seed                 # optional sample fleet and telemetry
npm run dev                  # API on http://localhost:3000
# in another terminal:
npm run dev:frontend         # Vite console, usually http://localhost:5173
```

The frontend uses `VITE_API_URL` when set and otherwise calls
`http://localhost:3000`. Production builds are created with `npm run build:all`.
The console includes a persistent System/Dark/Light theme selector backed by
`localStorage` (`orbitops-theme`) and the root `data-theme` attribute. Charts
use lightweight inline SVG sparklines and navigation uses accessible text
glyphs, avoiding extra Recharts/Lucide dependencies while remaining
dependency-compatible with the Vite React stack.

## Capabilities

* Satellite registration and status/orbit management
* Single and transactional batch telemetry ingestion
* Telemetry filtering, recent-sample charts, and anomaly detection
* Mission planning with satellite assignments and reachability analysis
* Alert creation, severity filtering, and acknowledgement
* Explicit packet modules: Array, LinkedList transmit buffer, LIFO Stack,
  capacity-five CircularQueue, mission-log BST, weighted Graph BFS/Dijkstra,
  bubble-sort/binary-search events, and capacity-ten linear-probing hash table
  with tombstones
* Eight standalone C11 reference programs in `c-reference/`

## API

The API is documented in [`docs/API.md`](docs/API.md). SQLite is created under
`data/telemetry.db`; set `DATA_DIR` to relocate it. `PORT` changes the API
port. The frontend is intentionally usable with an empty database and shows
an offline demo view if the API is unavailable.

## Validation

```bash
npm run typecheck:all
npm test
npm run build:all
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data model and
algorithm mapping.
