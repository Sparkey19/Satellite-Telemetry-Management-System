# REST API

All resource endpoints are prefixed with `/api`. JSON errors have the shape
`{"error":"..."}`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Service liveness |
| GET/POST/PATCH | `/api/satellites`, `/api/satellites/:id` | Fleet registry |
| GET/POST | `/api/telemetry` | Query or ingest one sample |
| POST | `/api/telemetry/batch` | Transactional array ingestion |
| GET/POST | `/api/missions`, `/api/missions/:id` | Mission planning |
| GET | `/api/missions/:id/reachable` | BFS mission dependency reachability |
| GET/POST | `/api/alerts` | Alert feed and creation |
| PATCH | `/api/alerts/:id/acknowledge` | Acknowledge an alert |
| GET | `/api/analytics/summary` | Fleet metrics and algorithm outputs |
| GET | `/api/analytics/anomalies/:satelliteId` | Temperature outlier samples |

## Data-structure modules

All module endpoints use the shared packet shape
`packetID`, `timestamp`, `batteryStatus`, `payloadType`, `status`, and persist
their state in SQLite:

* `/api/array` — insert/list/delete packets
* `/api/linked-list` and `/api/linked-list/transmit` — FIFO linked-list buffer
* `/api/stack`, `/api/stack/push`, `/api/stack/pop` — LIFO packet stack
* `/api/queue`, `/api/queue/receive`, `/api/queue/transmit` — circular queue
  with capacity five
* `/api/bst` — insert and in-order list mission logs
* `/api/graph`, `/api/graph/route` — weighted edges, BFS and Dijkstra route
* `/api/events/sort` and `/api/events/search?packetID=...` — bubble sort and
  binary search
* `/api/hash-table`, `/api/hash-table/insert`, `/api/hash-table/search`, and
  `DELETE /api/hash-table/:packetID` — fixed capacity-ten linear-probing
  table with tombstones

Telemetry requires `satelliteId`, `temperature`, `batteryVoltage`, and
`signalStrength`. Optional location, altitude, ISO timestamp, and arbitrary
payload fields are accepted. Query telemetry with `satelliteId` and `limit`
(capped at 1000).
