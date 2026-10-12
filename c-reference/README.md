# C reference programs

These standalone C11 programs match the required eight satellite packet
modules. Each uses the shared packet-oriented operations and prints a
deterministic demonstration:

| Program | Demonstration |
| --- | --- |
| `q1.c` | Fixed-capacity Array |
| `q2.c` | Explicit-node LinkedList and transmit |
| `q3.c` | LIFO Stack push/pop |
| `q4.c` | CircularQueue with capacity 5 |
| `q5.c` | BST mission logs and in-order traversal |
| `q6.c` | Weighted Graph BFS and Dijkstra |
| `q7.c` | Bubble sort and binary search events |
| `q8.c` | Fixed hash table, `packetID % 10`, linear probing |

The production TypeScript service exposes the same named modules through REST
endpoints. `q4.c` rejects its sixth item to demonstrate queue overflow and
`q8.c` demonstrates a collision resolved by linear probing.

## Build and run

From this directory, use a C11 compiler and Make:

```sh
make
./q3
./q5
./q6
```

On Windows with MinGW, `mingw32-make` can be used instead of `make`; the
generated executables have an `.exe` suffix. To remove compiled binaries:

```sh
make clean
```

The examples have no external dependencies. `q4` additionally links the
standard math library (`-lm` on toolchains that require it).
