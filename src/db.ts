import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.DATA_DIR ?? "data");
fs.mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(dataDir, "telemetry.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS satellites (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
 orbit TEXT NOT NULL DEFAULT 'LEO', launched_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS telemetry (
 id INTEGER PRIMARY KEY AUTOINCREMENT, satellite_id TEXT NOT NULL REFERENCES satellites(id),
 timestamp TEXT NOT NULL, temperature REAL NOT NULL, battery_voltage REAL NOT NULL,
 signal_strength REAL NOT NULL, latitude REAL, longitude REAL, altitude REAL, payload TEXT
);
CREATE INDEX IF NOT EXISTS telemetry_satellite_time ON telemetry(satellite_id, timestamp);
CREATE TABLE IF NOT EXISTS missions (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'planned', start_date TEXT, end_date TEXT, satellite_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS alerts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, satellite_id TEXT NOT NULL, severity TEXT NOT NULL,
 type TEXT NOT NULL, message TEXT NOT NULL, acknowledged INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS packets (
 packet_id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, battery_status REAL NOT NULL,
 payload_type TEXT NOT NULL, status TEXT NOT NULL, payload TEXT
);
CREATE INDEX IF NOT EXISTS packets_timestamp ON packets(timestamp);
CREATE TABLE IF NOT EXISTS module_state (
 module TEXT PRIMARY KEY, state TEXT NOT NULL
);
`);
