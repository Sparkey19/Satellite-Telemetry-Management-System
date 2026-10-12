import type { Alert, Mission, Packet, Satellite, Summary, Telemetry } from "./types";
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? `Request failed (${response.status})`);
  return response.json();
}
export const api = {
  satellites: () => request<Satellite[]>("/api/satellites"),
  telemetry: (id?: string) => request<Telemetry[]>(`/api/telemetry?limit=100${id ? `&satelliteId=${encodeURIComponent(id)}` : ""}`),
  missions: () => request<Mission[]>("/api/missions"),
  alerts: (active = false) => request<Alert[]>(`/api/alerts${active ? "?active=true" : ""}`),
  summary: () => request<Summary>("/api/analytics/summary"),
  createSatellite: (body: Partial<Satellite>) => request<Satellite>("/api/satellites", { method: "POST", body: JSON.stringify(body) }),
  createMission: (body: Partial<Mission>) => request<Mission>("/api/missions", { method: "POST", body: JSON.stringify(body) }),
  createTelemetry: (body: Omit<Telemetry, "id" | "timestamp"> & { timestamp?: string }) => request<Telemetry>("/api/telemetry", { method: "POST", body: JSON.stringify(body) }),
  acknowledge: (id: number) => request(`/api/alerts/${id}/acknowledge`, { method: "PATCH" })
  ,module: (name: string) => request<{ items?: Packet[]; logs?: unknown[]; events?: Packet[]; edges?: unknown[]; capacity?: number }>(`/api/${name}`)
  ,packet: (endpoint: string, body: Packet) => request(endpoint, { method: "POST", body: JSON.stringify(body) })
  ,action: (endpoint: string, body?: unknown) => request(endpoint, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })
  ,searchEvents: (timestamp: string) => request<{ matches: Packet[]; comparisons: number }>(`/api/events/search?timestamp=${encodeURIComponent(timestamp)}`)
  ,graphRoute: (body: { start: string; target: string; algorithm: "both" | "bfs" | "dijkstra" }) => request<{ bfs?: unknown; dijkstra?: unknown; reachable: boolean }>("/api/graph/route", { method: "POST", body: JSON.stringify(body) })
};
