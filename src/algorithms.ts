/** Eight small, reusable structures/algorithms used by the service. */
export class TelemetryHashMap<T> {
  private readonly values = new Map<string, T>();
  set(key: string, value: T): void { this.values.set(key, value); }
  get(key: string): T | undefined { return this.values.get(key); }
  has(key: string): boolean { return this.values.has(key); }
  entries(): IterableIterator<[string, T]> { return this.values.entries(); }
}

export class RingBuffer<T> {
  private readonly values: T[] = [];
  constructor(private readonly capacity: number) {}
  push(value: T): void { this.values.push(value); if (this.values.length > this.capacity) this.values.shift(); }
  toArray(): T[] { return [...this.values]; }
}

export type PriorityItem = { priority: number; value: string };
export class MinHeap {
  private heap: PriorityItem[] = [];
  push(item: PriorityItem): void {
    this.heap.push(item); let i = this.heap.length - 1;
    while (i > 0) { const p = Math.floor((i - 1) / 2); if (this.heap[p].priority <= item.priority) break; this.heap[i] = this.heap[p]; i = p; }
    this.heap[i] = item;
  }
  pop(): PriorityItem | undefined {
    if (!this.heap.length) return undefined;
    const result = this.heap[0], last = this.heap.pop()!;
    if (this.heap.length) { let i = 0; while (i * 2 + 1 < this.heap.length) { let c = i * 2 + 1; if (c + 1 < this.heap.length && this.heap[c + 1].priority < this.heap[c].priority) c++; if (this.heap[c].priority >= last.priority) break; this.heap[i] = this.heap[c]; i = c; } this.heap[i] = last; }
    return result;
  }
}

export class SlidingWindow {
  private readonly values: number[] = [];
  constructor(private readonly size: number) {}
  add(value: number): void { this.values.push(value); if (this.values.length > this.size) this.values.shift(); }
  average(): number { return this.values.length ? this.values.reduce((a, b) => a + b, 0) / this.values.length : 0; }
  standardDeviation(): number { const mean = this.average(); return this.values.length ? Math.sqrt(this.values.reduce((s, x) => s + (x - mean) ** 2, 0) / this.values.length) : 0; }
}

export function binarySearchNearest(sorted: number[], target: number): number | undefined {
  if (!sorted.length) return undefined; let low = 0, high = sorted.length - 1;
  while (low < high) { const mid = Math.floor((low + high) / 2); if (sorted[mid] < target) low = mid + 1; else high = mid; }
  if (low === 0 || Math.abs(sorted[low] - target) < Math.abs(sorted[low - 1] - target)) return sorted[low];
  return sorted[low - 1];
}

export class MissionGraph {
  private readonly edges = new Map<string, Set<string>>();
  addEdge(from: string, to: string): void { if (!this.edges.has(from)) this.edges.set(from, new Set()); this.edges.get(from)!.add(to); }
  reachable(start: string): string[] {
    const seen = new Set<string>([start]), queue = [start], result: string[] = [];
    while (queue.length) { const node = queue.shift()!; result.push(node); for (const next of this.edges.get(node) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); } }
    return result;
  }
}

export class IntervalIndex {
  private readonly intervals: Array<{ start: number; end: number; value: string }> = [];
  add(start: number, end: number, value: string): void { this.intervals.push({ start, end, value }); }
  query(point: number): string[] { return this.intervals.filter((i) => i.start <= point && point <= i.end).map((i) => i.value); }
}

export class ExponentialMovingAverage {
  private current?: number;
  constructor(private readonly alpha = 0.2) {}
  add(value: number): number { this.current = this.current === undefined ? value : this.alpha * value + (1 - this.alpha) * this.current; return this.current; }
  value(): number | undefined { return this.current; }
}

export type Packet = {
  packetID: number;
  timestamp: string;
  batteryStatus: number;
  payloadType: string;
  status: string;
  payload?: unknown;
};

export class PacketArray {
  private items: Packet[] = [];
  constructor(private readonly capacity = 10, items: Packet[] = []) { this.items = items.slice(0, capacity); }
  add(packet: Packet): { accepted: boolean; overflow: Packet | null; items: Packet[] } { if (this.items.length >= this.capacity) return { accepted: false, overflow: packet, items: this.list() }; this.items.push(packet); return { accepted: true, overflow: null, items: this.list() }; }
  remove(packetID: number): Packet | undefined { const i = this.items.findIndex(p => p.packetID === packetID); return i < 0 ? undefined : this.items.splice(i, 1)[0]; }
  list(): Packet[] { return [...this.items]; }
  find(packetID: number): Packet | undefined { return this.items.find(p => p.packetID === packetID); }
}

export class LinkedList {
  private head?: { packet: Packet; next?: { packet: Packet; next?: unknown } };
  private tail?: { packet: Packet; next?: { packet: Packet; next?: unknown } };
  private size = 0;
  constructor(items: Packet[] = []) { items.forEach(p => this.append(p)); }
  append(packet: Packet): void { const node = { packet, next: undefined }; if (this.tail) this.tail.next = node; else this.head = node; this.tail = node; this.size++; }
  remove(packetID: number): Packet | undefined { let prev: typeof this.head; let node = this.head; while (node && node.packet.packetID !== packetID) { prev = node; node = node.next as typeof node; } if (!node) return undefined; if (prev) prev.next = node.next as typeof prev.next; else this.head = node.next as typeof this.head; if (this.tail === node) this.tail = prev; this.size--; return node.packet; }
  list(): Packet[] { const out: Packet[] = []; let node = this.head; while (node) { out.push(node.packet); node = node.next as typeof node; } return out; }
  transmit(): Packet | undefined { if (!this.head) return undefined; const packet = this.head.packet; this.head = this.head.next as typeof this.head; this.size--; if (!this.size) this.tail = undefined; return packet; }
}

export class PacketStack {
  private items: Packet[] = [];
  push(packet: Packet): Packet[] { this.items.push(packet); return this.list(); }
  pop(): Packet | undefined { return this.items.pop(); }
  peek(): Packet | undefined { return this.items[this.items.length - 1]; }
  list(): Packet[] { return [...this.items].reverse(); }
}

export class CircularQueue {
  private items: Packet[] = [];
  constructor(public readonly capacity = 5) {}
  enqueue(packet: Packet): { accepted: boolean; queue: Packet[] } {
    if (this.items.length >= this.capacity) return { accepted: false, queue: this.list() };
    this.items.push(packet); return { accepted: true, queue: this.list() };
  }
  dequeue(): Packet | undefined { return this.items.shift(); }
  list(): Packet[] { return [...this.items]; }
  get size(): number { return this.items.length; }
}

export type MissionLog = { missionID: string; timestamp: string; message: string; status?: string };
type BstNode = { value: MissionLog; left?: BstNode; right?: BstNode };
export class MissionLogBST {
  private root?: BstNode;
  insert(value: MissionLog): void {
    const node = { value };
    if (!this.root) { this.root = node; return; }
    let current = this.root;
    while (true) {
      const a = `${value.timestamp}|${value.missionID}|${value.message}`, b = `${current.value.timestamp}|${current.value.missionID}|${current.value.message}`;
      if (a < b) { if (current.left) current = current.left; else { current.left = node; return; } }
      else { if (current.right) current = current.right; else { current.right = node; return; } }
    }
  }
  search(timestamp: string): MissionLog[] { return this.inOrder().filter(x => x.timestamp === timestamp); }
  inOrder(): MissionLog[] { const out: MissionLog[] = []; const walk = (n?: BstNode) => { if (!n) return; walk(n.left); out.push(n.value); walk(n.right); }; walk(this.root); return out; }
  preOrder(): MissionLog[] { const out: MissionLog[] = []; const walk = (n?: BstNode) => { if (!n) return; out.push(n.value); walk(n.left); walk(n.right); }; walk(this.root); return out; }
  postOrder(): MissionLog[] { const out: MissionLog[] = []; const walk = (n?: BstNode) => { if (!n) return; walk(n.left); walk(n.right); out.push(n.value); }; walk(this.root); return out; }
  min(): MissionLog | undefined { return this.inOrder()[0]; }
  max(): MissionLog | undefined { const values = this.inOrder(); return values[values.length - 1]; }
}

export type GraphEdge = { from: string; to: string; weight: number };
export class WeightedGraph {
  private edges = new Map<string, Array<{ node: string; weight: number }>>();
  addEdge(edge: GraphEdge): void { if (!this.edges.has(edge.from)) this.edges.set(edge.from, []); this.edges.get(edge.from)!.push({ node: edge.to, weight: edge.weight }); }
  bfs(start: string, target?: string): { path: string[]; hops: number } { const seen = new Set([start]), queue = [start], prev = new Map<string, string>(); while (queue.length) { const n = queue.shift()!; if (n === target) { const path = [n]; while (path[0] !== start) path.unshift(prev.get(path[0])!); return { path, hops: path.length - 1 }; } for (const e of this.edges.get(n) ?? []) if (!seen.has(e.node)) { seen.add(e.node); prev.set(e.node, n); queue.push(e.node); } } return { path: [], hops: -1 }; }
  dijkstra(start: string, target: string): { path: string[]; distance: number } {
    const dist = new Map<string, number>([[start, 0]]), prev = new Map<string, string>(); const unvisited = new Set(this.edges.keys()); this.edges.forEach(es => es.forEach(e => unvisited.add(e.node)));
    while (unvisited.size) { let current: string | undefined; let best = Infinity; for (const n of unvisited) if ((dist.get(n) ?? Infinity) < best) { current = n; best = dist.get(n)!; } if (!current) break; unvisited.delete(current); for (const e of this.edges.get(current) ?? []) { const next = best + e.weight; if (next < (dist.get(e.node) ?? Infinity)) { dist.set(e.node, next); prev.set(e.node, current); } } }
    if (!dist.has(target)) return { path: [], distance: Infinity }; const path = [target]; while (path[0] !== start) path.unshift(prev.get(path[0])!); return { path, distance: dist.get(target)! };
  }
}

export function bubbleSortPackets(packets: Packet[]): Packet[] { const out = [...packets]; for (let i = 0; i < out.length - 1; i++) for (let j = 0; j < out.length - i - 1; j++) if (out[j].timestamp > out[j + 1].timestamp) [out[j], out[j + 1]] = [out[j + 1], out[j]]; return out; }
export function binarySearchPackets(packets: Packet[], timestamp: string): { matches: Packet[]; comparisons: number } { let lo = 0, hi = packets.length - 1, comparisons = 0, found = -1; while (lo <= hi) { comparisons++; const mid = Math.floor((lo + hi) / 2); if (packets[mid].timestamp === timestamp) { found = mid; break; } if (packets[mid].timestamp < timestamp) lo = mid + 1; else hi = mid - 1; } if (found < 0) return { matches: [], comparisons }; let start = found; while (start > 0 && packets[start - 1].timestamp === timestamp) { comparisons++; start--; } let end = found; while (end + 1 < packets.length && packets[end + 1].timestamp === timestamp) { comparisons++; end++; } return { matches: packets.slice(start, end + 1), comparisons }; }

export class FixedHashTable {
  private slots: Array<Packet | null | typeof TOMBSTONE>;
  constructor(public readonly capacity = 10) { this.slots = Array(capacity).fill(null); }
  private index(key: number): number { return key % this.capacity; }
  insert(packet: Packet): boolean { let tomb = -1; for (let i = 0; i < this.capacity; i++) { const p = this.slots[(this.index(packet.packetID) + i) % this.capacity]; if (p === TOMBSTONE && tomb < 0) tomb = (this.index(packet.packetID) + i) % this.capacity; else if (p === null) { this.slots[tomb >= 0 ? tomb : (this.index(packet.packetID) + i) % this.capacity] = packet; return true; } else if (p !== TOMBSTONE && p.packetID === packet.packetID) { this.slots[(this.index(packet.packetID) + i) % this.capacity] = packet; return true; } } return false; }
  search(key: number): Packet | undefined { for (let i = 0; i < this.capacity; i++) { const p = this.slots[(this.index(key) + i) % this.capacity]; if (p === null) return undefined; if (p !== TOMBSTONE && p.packetID === key) return p; } return undefined; }
  delete(key: number): boolean { for (let i = 0; i < this.capacity; i++) { const at = (this.index(key) + i) % this.capacity, p = this.slots[at]; if (p === null) return false; if (p !== TOMBSTONE && p.packetID === key) { this.slots[at] = TOMBSTONE; return true; } } return false; }
  list(): Packet[] { return this.slots.filter((p): p is Packet => p !== null && p !== TOMBSTONE); }
}
const TOMBSTONE = Symbol("tombstone");
