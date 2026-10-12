import { db } from "./db";

const satellites = [
  ["OPSAT-01", "Aurora Pathfinder", "active", "LEO · 408 km"],
  ["OPSAT-02", "Terra Watch", "active", "SSO · 612 km"],
  ["OPSAT-03", "Deep Space Relay", "inactive", "GEO · 35,786 km"]
];

const existing = Number((db.prepare("SELECT COUNT(*) AS count FROM satellites").get() as { count: number }).count);
if (existing === 0) {
  const insertSatellite = db.prepare("INSERT INTO satellites (id,name,status,orbit,launched_at,created_at) VALUES (?,?,?,?,?,?)");
  satellites.forEach(([id, name, status, orbit], index) => insertSatellite.run(id, name, status, orbit, `202${4 - index}-0${index + 2}-18`, new Date().toISOString()));
  const insertTelemetry = db.prepare("INSERT INTO telemetry (satellite_id,timestamp,temperature,battery_voltage,signal_strength,latitude,longitude,altitude,payload) VALUES (?,?,?,?,?,?,?,?,?)");
  for (let i = 0; i < 48; i += 1) {
    const satelliteId = satellites[i % 2][0];
    insertTelemetry.run(satelliteId, new Date(Date.now() - i * 3600000).toISOString(), 22 + Math.sin(i / 2) * 5, 27.4 - i * 0.02, 86 - (i % 5) * 2, 12.97, 77.59, 408, JSON.stringify({ source: "seed", packet: i }));
  }
  db.prepare("INSERT INTO alerts (satellite_id,severity,type,message,created_at) VALUES (?,?,?,?,?)").run("OPSAT-01", "warning", "THERMAL", "Payload temperature approaching upper threshold", new Date().toISOString());
  db.prepare("INSERT INTO missions (id,name,description,status,start_date,end_date,satellite_ids) VALUES (?,?,?,?,?,?,?)").run("M-2026-01", "Polar Ice Survey", "High-resolution polar observation campaign", "active", "2026-07-01", "2026-12-31", JSON.stringify(["OPSAT-02"]));
  console.log("Seeded sample fleet, telemetry, alert, and mission.");
} else {
  console.log("Database already contains satellites; no changes made.");
}
