#include <stdio.h>
#define CAPACITY 5
int main(void) { int queue[CAPACITY], front = 0, size = 0; for (int id = 401; id <= 406; ++id) { if (size == CAPACITY) { printf("overflow packet %d\n", id); break; } queue[(front + size) % CAPACITY] = id; ++size; } printf("CircularQueue capacity=%d:", CAPACITY); while (size) { printf(" %d", queue[front]); front = (front + 1) % CAPACITY; --size; } putchar('\n'); return 0; }
