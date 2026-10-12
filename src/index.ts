import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { z } from "zod";
import { db } from "./db";
import { ExponentialMovingAverage, MissionGraph, MinHeap, RingBuffer, SlidingWindow, TelemetryHashMap, Packet, PacketArray, LinkedList, PacketStack, CircularQueue, MissionLog, MissionLogBST, WeightedGraph, GraphEdge, bubbleSortPackets, binarySearchPackets, FixedHashTable } from "./algorithms";
import { TelemetryInput } from "./types";
import crypto from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

const telemetrySchema = z.object({
  satelliteId: z.string().min(1), timestamp: z.string().datetime().optional(),
  temperature: z.number().finite(), batteryVoltage: z.number().finite(),
  signalStrength: z.number().finite(), latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(), altitude: z.number().finite().optional(),
  payload: z.record(z.unknown()).optional()
});
const satelliteSchema = z.object({ id: z.string().min(1).optional(), name: z.string().min(1), status: z.enum(["active", "inactive", "decommissioned"]).optional(), orbit: z.string().default("LEO"), launchedAt: z.string().optional() });
const missionSchema = z.object({ name: z.string().min(1), description: z.string().optional(), status: z.enum(["planned", "active", "completed", "cancelled"]).optional(), startDate: z.string().optional(), endDate: z.string().optional(), satelliteIds: z.array(z.string()).optional() });
const alertSchema = z.object({ satelliteId: z.string().min(1), severity: z.enum(["info", "warning", "critical"]), type: z.string().min(1), message: z.string().min(1) });
const now = () => new Date().toISOString();
const badRequest = (res: Response, error: unknown) => res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });

const packetSchema = z.object({
  packetID: z.number().int().positive(), timestamp: z.string().datetime().optional(),
  batteryStatus: z.number().finite(), payloadType: z.string().min(1),
  status: z.string().min(1), payload: z.unknown().optional()
});
const packetFromRow = (r: Record<string, unknown>): Packet => ({ packetID: Number(r.packet_id), timestamp: String(r.timestamp), batteryStatus: Number(r.battery_status), payloadType: String(r.payload_type), status: String(r.status), payload: r.payload ? JSON.parse(String(r.payload)) : undefined });
const readPackets = (): Packet[] => (db.prepare("SELECT * FROM packets ORDER BY timestamp,packet_id").all() as Array<Record<string, unknown>>).map(packetFromRow);
const writePackets = (packets: Packet[]): void => { db.prepare("DELETE FROM packets").run(); const s = db.prepare("INSERT INTO packets (packet_id,timestamp,battery_status,payload_type,status,payload) VALUES (?,?,?,?,?,?)"); packets.forEach(p => s.run(p.packetID, p.timestamp, p.batteryStatus, p.payloadType, p.status, p.payload === undefined ? null : JSON.stringify(p.payload))); };
const state = <T>(module: string, fallback: T): T => { const row = db.prepare("SELECT state FROM module_state WHERE module=?").get(module) as { state: string } | undefined; if (!row) return fallback; try { return JSON.parse(row.state) as T; } catch { return fallback; } };
const saveState = (module: string, value: unknown): void => { db.prepare("INSERT INTO module_state(module,state) VALUES(?,?) ON CONFLICT(module) DO UPDATE SET state=excluded.state").run(module, JSON.stringify(value)); };

app.get("/api/array", (_req, res) => res.json({ module: "Array", items: readPackets() }));
app.post("/api/array", (req, res) => { const p = packetSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); if (readPackets().some(x => x.packetID === p.data.packetID)) return res.status(409).json({ error: "packetID must be unique" }); const a = new PacketArray(10, readPackets()); const result = a.add({ ...p.data, timestamp: p.data.timestamp ?? now() }); if (!result.accepted) return res.status(409).json({ error: "Array capacity (10) reached", overflow: result.overflow }); writePackets(result.items); return res.status(201).json({ module: "Array", capacity: 10, items: result.items }); });
app.delete("/api/array/:packetID", (req, res) => { const id = Number(req.params.packetID); const a = new PacketArray(10, readPackets()); const removed = a.remove(id); if (!removed) return res.status(404).json({ error: "Packet not found" }); writePackets(a.list()); return res.json({ removed, items: a.list() }); });

app.get("/api/linked-list", (_req, res) => res.json({ module: "LinkedList", items: state<Packet[]>("linked-list", []) }));
app.post("/api/linked-list", (req, res) => { const p = packetSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); const l = new LinkedList(state<Packet[]>("linked-list", [])); l.append({ ...p.data, timestamp: p.data.timestamp ?? now() }); saveState("linked-list", l.list()); return res.status(201).json({ items: l.list() }); });
app.post("/api/linked-list/transmit", (_req, res) => { const l = new LinkedList(state<Packet[]>("linked-list", [])); const packet = l.transmit(); saveState("linked-list", l.list()); return packet ? res.json({ packet, items: l.list() }) : res.status(404).json({ error: "Linked list is empty" }); });

app.get("/api/stack", (_req, res) => res.json({ module: "Stack", items: state<Packet[]>("stack", []) }));
app.post("/api/stack/push", (req, res) => { const p = packetSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); const s = new PacketStack(); state<Packet[]>("stack", []).forEach(x => s.push(x)); s.push({ ...p.data, timestamp: p.data.timestamp ?? now() }); saveState("stack", s.list().reverse()); return res.status(201).json({ items: s.list() }); });
app.post("/api/stack/pop", (_req, res) => { const s = new PacketStack(); state<Packet[]>("stack", []).forEach(x => s.push(x)); const packet = s.pop(); saveState("stack", s.list().reverse()); return packet ? res.json({ packet, items: s.list() }) : res.status(404).json({ error: "Stack is empty" }); });

app.get("/api/queue", (_req, res) => res.json({ module: "CircularQueue", capacity: 5, items: state<Packet[]>("queue", []) }));
app.post("/api/queue/receive", (req, res) => { const p = packetSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); const q = new CircularQueue(5); state<Packet[]>("queue", []).forEach(x => q.enqueue(x)); const result = q.enqueue({ ...p.data, timestamp: p.data.timestamp ?? now() }); saveState("queue", q.list()); return result.accepted ? res.status(201).json({ ...result, capacity: 5 }) : res.status(409).json({ ...result, capacity: 5, error: "Circular queue capacity (5) reached" }); });
app.post("/api/queue/transmit", (_req, res) => { const q = new CircularQueue(5); state<Packet[]>("queue", []).forEach(x => q.enqueue(x)); const packet = q.dequeue(); saveState("queue", q.list()); return packet ? res.json({ packet, capacity: 5, items: q.list() }) : res.status(404).json({ error: "Queue is empty" }); });

app.get("/api/bst", (req, res) => { const tree = new MissionLogBST(); state<MissionLog[]>("bst", []).forEach(x => tree.insert(x)); const timestamp = typeof req.query.timestamp === "string" ? req.query.timestamp : undefined; return res.json({ module: "BST", logs: tree.inOrder(), inOrder: tree.inOrder(), preOrder: tree.preOrder(), postOrder: tree.postOrder(), min: tree.min() ?? null, max: tree.max() ?? null, search: timestamp ? tree.search(timestamp) : [] }); });
app.post("/api/bst", (req, res) => { const p = z.object({ missionID: z.string().min(1), timestamp: z.string().datetime().optional(), message: z.string().min(1), status: z.string().optional() }).safeParse(req.body); if (!p.success) return badRequest(res, p.error); const tree = new MissionLogBST(); const log = { ...p.data, timestamp: p.data.timestamp ?? now() }; state<MissionLog[]>("bst", []).forEach(x => tree.insert(x)); tree.insert(log); saveState("bst", tree.inOrder()); return res.status(201).json({ log, logs: tree.inOrder() }); });
app.get("/api/graph", (_req, res) => res.json({ module: "WeightedGraph", edges: state<GraphEdge[]>("graph", []) }));
app.post("/api/graph", (req, res) => { const p = z.object({ from: z.string().min(1), to: z.string().min(1), weight: z.number().nonnegative() }).safeParse(req.body); if (!p.success) return badRequest(res, p.error); const edges = state<GraphEdge[]>("graph", []); edges.push(p.data); saveState("graph", edges); return res.status(201).json({ edge: p.data, edges }); });
app.post("/api/graph/route", (req, res) => { const p = z.object({ start: z.string().min(1), target: z.string().min(1), algorithm: z.enum(["bfs", "dijkstra", "both"]).default("both") }).safeParse(req.body); if (!p.success) return badRequest(res, p.error); const graph = new WeightedGraph(); state<GraphEdge[]>("graph", []).forEach(e => graph.addEdge(e)); const result: Record<string, unknown> = { algorithm: p.data.algorithm }; if (p.data.algorithm === "bfs" || p.data.algorithm === "both") result.bfs = graph.bfs(p.data.start, p.data.target); if (p.data.algorithm === "dijkstra" || p.data.algorithm === "both") result.dijkstra = graph.dijkstra(p.data.start, p.data.target); return res.json({ ...result, reachable: (result.bfs as { path: string[] } | undefined)?.path.length ? true : (result.dijkstra as { path: string[] } | undefined)?.path.length ? true : false }); });

app.get("/api/events", (_req, res) => res.json({ events: readPackets() }));
app.post("/api/events/sort", (_req, res) => res.json({ algorithm: "bubble sort", events: bubbleSortPackets(readPackets()) }));
app.get("/api/events/search", (req, res) => { const timestamp = typeof req.query.timestamp === "string" ? req.query.timestamp : ""; const result = binarySearchPackets(readPackets().sort((a, b) => a.timestamp.localeCompare(b.timestamp)), timestamp); return res.json({ algorithm: "binary search", timestamp, matches: result.matches, comparisons: result.comparisons }); });

app.get("/api/hash-table", (_req, res) => { const table = new FixedHashTable(10); state<Packet[]>("hash-table", []).forEach(p => table.insert(p)); return res.json({ module: "HashTable", capacity: 10, items: table.list() }); });
app.post("/api/hash-table/insert", (req, res) => { const p = packetSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); const table = new FixedHashTable(10); state<Packet[]>("hash-table", []).forEach(x => table.insert(x)); const packet = { ...p.data, timestamp: p.data.timestamp ?? now() }; if (!table.insert(packet)) return res.status(409).json({ error: "Hash table capacity (10) reached" }); saveState("hash-table", table.list()); return res.status(201).json({ capacity: 10, items: table.list() }); });
app.get("/api/hash-table/search", (req, res) => { const table = new FixedHashTable(10); state<Packet[]>("hash-table", []).forEach(x => table.insert(x)); const packetID = Number(req.query.packetID); return res.json({ packet: table.search(packetID) ?? null }); });
app.delete("/api/hash-table/:packetID", (req, res) => { const table = new FixedHashTable(10); state<Packet[]>("hash-table", []).forEach(x => table.insert(x)); if (!table.delete(Number(req.params.packetID))) return res.status(404).json({ error: "Packet not found" }); saveState("hash-table", table.list()); return res.json({ deleted: Number(req.params.packetID), items: table.list() }); });

app.get("/health", (_req, res) => res.json({ status: "ok", service: "satellite-telemetry", time: now() }));

app.post("/api/satellites", (req, res) => {
  const parsed = satelliteSchema.safeParse(req.body); if (!parsed.success) return badRequest(res, parsed.error);
  const s = parsed.data, id = s.id ?? crypto.randomUUID();
  try { db.prepare("INSERT INTO satellites (id,name,status,orbit,launched_at,created_at) VALUES (?,?,?,?,?,?)").run(id, s.name, s.status ?? "active", s.orbit, s.launchedAt ?? null, now()); return res.status(201).json({ id, ...s, status: s.status ?? "active" }); } catch { return res.status(409).json({ error: "Satellite id already exists" }); }
});
app.get("/api/satellites", (_req, res) => res.json(db.prepare("SELECT id,name,status,orbit,launched_at AS launchedAt,created_at AS createdAt FROM satellites ORDER BY name").all()));
app.get("/api/satellites/:id", (req, res) => { const row = db.prepare("SELECT id,name,status,orbit,launched_at AS launchedAt,created_at AS createdAt FROM satellites WHERE id=?").get(req.params.id); return row ? res.json(row) : res.status(404).json({ error: "Satellite not found" }); });
app.patch("/api/satellites/:id", (req, res) => { const allowed = satelliteSchema.partial().safeParse(req.body); if (!allowed.success) return badRequest(res, allowed.error); const s = allowed.data; const result = db.prepare("UPDATE satellites SET name=COALESCE(?,name),status=COALESCE(?,status),orbit=COALESCE(?,orbit),launched_at=COALESCE(?,launched_at) WHERE id=?").run(s.name ?? null, s.status ?? null, s.orbit ?? null, s.launchedAt ?? null, req.params.id); return result.changes ? res.json(db.prepare("SELECT * FROM satellites WHERE id=?").get(req.params.id)) : res.status(404).json({ error: "Satellite not found" }); });

app.post("/api/telemetry", (req, res) => {
  const parsed = telemetrySchema.safeParse(req.body); if (!parsed.success) return badRequest(res, parsed.error);
  const t = parsed.data as TelemetryInput;
  if (!db.prepare("SELECT 1 FROM satellites WHERE id=?").get(t.satelliteId)) return res.status(404).json({ error: "Satellite not found" });
  const result = db.prepare("INSERT INTO telemetry (satellite_id,timestamp,temperature,battery_voltage,signal_strength,latitude,longitude,altitude,payload) VALUES (?,?,?,?,?,?,?,?,?)").run(t.satelliteId, t.timestamp ?? now(), t.temperature, t.batteryVoltage, t.signalStrength, t.latitude ?? null, t.longitude ?? null, t.altitude ?? null, JSON.stringify(t.payload ?? {}));
  return res.status(201).json({ id: result.lastInsertRowid, ...t, timestamp: t.timestamp ?? now() });
});
app.post("/api/telemetry/batch", (req, res) => {
  if (!Array.isArray(req.body)) return badRequest(res, new Error("Body must be an array"));
  try {
    db.exec("BEGIN");
    const inserted = (req.body as unknown[]).map((item) => telemetrySchema.parse(item)).map((t) => {
      if (!db.prepare("SELECT 1 FROM satellites WHERE id=?").get(t.satelliteId)) throw new Error(`Satellite not found: ${t.satelliteId}`);
      return db.prepare("INSERT INTO telemetry (satellite_id,timestamp,temperature,battery_voltage,signal_strength,latitude,longitude,altitude,payload) VALUES (?,?,?,?,?,?,?,?,?)").run(t.satelliteId, t.timestamp ?? now(), t.temperature, t.batteryVoltage, t.signalStrength, t.latitude ?? null, t.longitude ?? null, t.altitude ?? null, JSON.stringify(t.payload ?? {})).lastInsertRowid;
    });
    db.exec("COMMIT");
    return res.status(201).json({ inserted });
  } catch (e) { try { db.exec("ROLLBACK"); } catch { /* transaction was not open */ } return badRequest(res, e); }
});
app.get("/api/telemetry", (req, res) => {
  const satelliteId = typeof req.query.satelliteId === "string" ? req.query.satelliteId : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit ?? 100) || 100, 1), 1000);
  const rows = db.prepare(`SELECT id,satellite_id AS satelliteId,timestamp,temperature,battery_voltage AS batteryVoltage,signal_strength AS signalStrength,latitude,longitude,altitude,payload FROM telemetry ${satelliteId ? "WHERE satellite_id=?" : ""} ORDER BY timestamp DESC LIMIT ?`).all(...(satelliteId ? [satelliteId, limit] : [limit])) as Array<Record<string, unknown>>;
  rows.forEach((r) => { try { r.payload = JSON.parse(String(r.payload)); } catch { /* malformed legacy payload remains a string */ } }); return res.json(rows);
});

app.post("/api/missions", (req, res) => { const p = missionSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); const m = p.data, id = crypto.randomUUID(); db.prepare("INSERT INTO missions (id,name,description,status,start_date,end_date,satellite_ids) VALUES (?,?,?,?,?,?,?)").run(id, m.name, m.description ?? "", m.status ?? "planned", m.startDate ?? null, m.endDate ?? null, JSON.stringify(m.satelliteIds ?? [])); return res.status(201).json({ id, ...m, status: m.status ?? "planned", satelliteIds: m.satelliteIds ?? [] }); });
app.get("/api/missions", (_req, res) => { const rows = db.prepare("SELECT id,name,description,status,start_date AS startDate,end_date AS endDate,satellite_ids AS satelliteIds FROM missions ORDER BY COALESCE(start_date,'9999')").all() as Array<Record<string, unknown>>; rows.forEach((r) => r.satelliteIds = JSON.parse(String(r.satelliteIds))); res.json(rows); });
app.get("/api/missions/:id", (req, res) => { const r = db.prepare("SELECT * FROM missions WHERE id=?").get(req.params.id) as Record<string, unknown> | undefined; if (!r) return res.status(404).json({ error: "Mission not found" }); r.satelliteIds = JSON.parse(String(r.satellite_ids)); delete r.satellite_ids; res.json(r); });

app.post("/api/alerts", (req, res) => { const p = alertSchema.safeParse(req.body); if (!p.success) return badRequest(res, p.error); const a = p.data; const result = db.prepare("INSERT INTO alerts (satellite_id,severity,type,message,created_at) VALUES (?,?,?,?,?)").run(a.satelliteId, a.severity, a.type, a.message, now()); res.status(201).json({ id: result.lastInsertRowid, ...a, acknowledged: false }); });
app.get("/api/alerts", (req, res) => { const active = req.query.active === "true"; const rows = db.prepare(`SELECT id,satellite_id AS satelliteId,severity,type,message,acknowledged,created_at AS createdAt FROM alerts ${active ? "WHERE acknowledged=0" : ""} ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>; rows.forEach((r) => r.acknowledged = Boolean(r.acknowledged)); res.json(rows); });
app.patch("/api/alerts/:id/acknowledge", (req, res) => { const result = db.prepare("UPDATE alerts SET acknowledged=1 WHERE id=?").run(req.params.id); return result.changes ? res.json({ id: Number(req.params.id), acknowledged: true }) : res.status(404).json({ error: "Alert not found" }); });

app.get("/api/analytics/summary", (_req, res) => {
  const counts = db.prepare("SELECT COUNT(*) AS telemetryCount,COUNT(DISTINCT satellite_id) AS satellitesReporting,AVG(temperature) AS averageTemperature,AVG(battery_voltage) AS averageBatteryVoltage,AVG(signal_strength) AS averageSignalStrength FROM telemetry").get();
  const alerts = db.prepare("SELECT severity,COUNT(*) AS count FROM alerts WHERE acknowledged=0 GROUP BY severity").all();
  const recent = db.prepare("SELECT satellite_id AS satelliteId,temperature,battery_voltage AS batteryVoltage,signal_strength AS signalStrength,timestamp FROM telemetry ORDER BY timestamp DESC LIMIT 20").all();
  const map = new TelemetryHashMap<number>(); const buffer = new RingBuffer<number>(20); const heap = new MinHeap(); const window = new SlidingWindow(20); const ema = new ExponentialMovingAverage(); (recent as Array<Record<string, unknown>>).forEach((r) => { map.set(String(r.satelliteId), Number(r.signalStrength)); buffer.push(Number(r.temperature)); heap.push({ priority: Number(r.batteryVoltage), value: String(r.satelliteId) }); window.add(Number(r.temperature)); ema.add(Number(r.temperature)); });
  return res.json({ ...counts, openAlerts: alerts, recentSamples: recent, algorithms: { reportingSatellites: Array.from(map.entries()).length, rollingTemperatureAverage: window.average(), rollingTemperatureStdDev: window.standardDeviation(), temperatureEma: ema.value(), bufferedSamples: buffer.toArray().length, lowestBatterySatellite: heap.pop()?.value ?? null } });
});
app.get("/api/dashboard/stats", (_req, res) => res.redirect("/api/analytics/summary"));
app.get("/api/dashboard/telemetry", (req, res) => res.redirect(`/api/telemetry?${new URLSearchParams(req.query as Record<string, string>).toString()}`));
app.get("/api/analytics/anomalies/:satelliteId", (req, res) => { const rows = db.prepare("SELECT * FROM telemetry WHERE satellite_id=? ORDER BY timestamp DESC LIMIT 100").all(req.params.satelliteId) as Array<{ temperature: number; battery_voltage: number; signal_strength: number; [key: string]: unknown }>; const values = rows.map((r) => r.temperature); const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1); const sd = Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length || 1)); return res.json(rows.filter((r) => Math.abs(r.temperature - mean) > 2 * sd && sd > 0).map((r) => ({ ...r, reason: "temperature exceeds two standard deviations" }))); });

const graph = new MissionGraph(); // mission dependency graph endpoint uses BFS.
app.get("/api/missions/:id/reachable", (req, res) => res.json({ missionId: req.params.id, reachable: graph.reachable(req.params.id) }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" }));
const port = Number(process.env.PORT ?? 3000);
if (require.main === module) app.listen(port, () => console.log(`Telemetry API listening on port ${port}`));
export default app;
