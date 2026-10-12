import assert from "node:assert/strict";
import test from "node:test";
import { ExponentialMovingAverage, IntervalIndex, MissionGraph, MinHeap, RingBuffer, SlidingWindow, TelemetryHashMap, binarySearchNearest } from "../src/algorithms";
import { CircularQueue, FixedHashTable, MissionLogBST, PacketArray, PacketStack, LinkedList, WeightedGraph, bubbleSortPackets, binarySearchPackets, type Packet } from "../src/algorithms";

const packet = (id: number, timestamp = "2026-01-01T00:00:00.000Z"): Packet => ({ packetID: id, timestamp, batteryStatus: 90, payloadType: "science", status: "received" });

test("hash map and ring buffer retain recent telemetry", () => {
  const map = new TelemetryHashMap<number>();
  map.set("OPSAT-01", 42);
  assert.equal(map.get("OPSAT-01"), 42);
  const buffer = new RingBuffer<number>(2);
  buffer.push(1); buffer.push(2); buffer.push(3);
  assert.deepEqual(buffer.toArray(), [2, 3]);
});

test("priority queue and sliding window calculate operational values", () => {
  const heap = new MinHeap();
  heap.push({ priority: 3, value: "low" }); heap.push({ priority: 1, value: "critical" });
  assert.equal(heap.pop()?.value, "critical");
  const window = new SlidingWindow(3);
  [10, 12, 14].forEach((value) => window.add(value));
  assert.equal(window.average(), 12);
  assert.equal(window.standardDeviation(), Math.sqrt(8 / 3));
});

test("search, graph, interval index, and EMA support analysis", () => {
  assert.equal(binarySearchNearest([10, 20, 30], 24), 20);
  const graph = new MissionGraph();
  graph.addEdge("mission-a", "mission-b"); graph.addEdge("mission-b", "mission-c");
  assert.deepEqual(graph.reachable("mission-a"), ["mission-a", "mission-b", "mission-c"]);
  const index = new IntervalIndex();
  index.add(10, 20, "contact");
  assert.deepEqual(index.query(15), ["contact"]);
  const ema = new ExponentialMovingAverage(0.5);
  ema.add(10); assert.equal(ema.add(20), 15);
});

test("spec packet modules implement their required operations", () => {
  const p1 = packet(1), p2 = packet(2, "2026-01-02T00:00:00.000Z");
  const array = new PacketArray(1); assert.equal(array.add(p1).accepted, true); assert.equal(array.add(p2).accepted, false); assert.equal(array.find(1)?.packetID, 1);
  const list = new LinkedList([p1]); list.append(p2); assert.equal(list.transmit()?.packetID, 1);
  const stack = new PacketStack(); stack.push(p1); stack.push(p2); assert.equal(stack.pop()?.packetID, 2);
  const queue = new CircularQueue(5); for (let i = 0; i < 5; i++) assert.equal(queue.enqueue(packet(i + 10)).accepted, true); assert.equal(queue.enqueue(p1).accepted, false);
  const bst = new MissionLogBST(); bst.insert({ missionID: "M1", timestamp: "2026-01-02T00:00:00.000Z", message: "late" }); bst.insert({ missionID: "M1", timestamp: "2026-01-01T00:00:00.000Z", message: "early" }); assert.equal(bst.inOrder()[0].message, "early");
  const graph = new WeightedGraph(); graph.addEdge({ from: "A", to: "B", weight: 2 }); graph.addEdge({ from: "B", to: "C", weight: 3 }); assert.deepEqual(graph.bfs("A", "C"), { path: ["A", "B", "C"], hops: 2 }); assert.deepEqual(graph.dijkstra("A", "C"), { path: ["A", "B", "C"], distance: 5 }); assert.deepEqual(graph.dijkstra("A", "Z"), { path: [], distance: Infinity });
  const duplicateTime = packet(3), sorted = bubbleSortPackets([p2, duplicateTime, p1]); assert.equal(binarySearchPackets(sorted, "2026-01-01T00:00:00.000Z").matches.length, 2);
  const table = new FixedHashTable(10); assert.equal(table.insert(p1), true); assert.equal(table.search(1)?.packetID, 1); assert.equal(table.delete(1), true); assert.equal(table.search(1), undefined);
});
