#include <stdio.h>
typedef struct { int packetID; int timestamp; } Event;
static void bubble(Event *a, size_t n) { for (size_t i = 0; i + 1 < n; ++i) for (size_t j = 0; j + 1 < n - i; ++j) if (a[j].timestamp > a[j + 1].timestamp) { Event t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; } }
static int search(const Event *a, size_t n, int timestamp) { size_t lo = 0, hi = n; while (lo < hi) { size_t m = (lo + hi) / 2; if (a[m].timestamp < timestamp) lo = m + 1; else hi = m; } return lo < n && a[lo].timestamp == timestamp ? (int)lo : -1; }
int main(void) { Event e[] = {{701, 30}, {702, 10}, {703, 10}, {704, 20}}; bubble(e, 4); printf("sorted/search timestamp=10: index=%d\n", search(e, 4, 10)); return 0; }
