#include <stdio.h>
#define CAPACITY 10
typedef struct { int id; int used; } Slot;
static int hash(int packetID) { return packetID % CAPACITY; }
static int insert(Slot *table, int id) { for (int i = 0; i < CAPACITY; ++i) { int p = (hash(id) + i) % CAPACITY; if (!table[p].used || table[p].id == id) { table[p] = (Slot){id, 1}; return 1; } } return 0; }
static int search(const Slot *table, int id) { for (int i = 0; i < CAPACITY; ++i) { int p = (hash(id) + i) % CAPACITY; if (!table[p].used) return -1; if (table[p].id == id) return p; } return -1; }
int main(void) { Slot table[CAPACITY] = {0}; insert(table, 801); insert(table, 811); printf("HashTable capacity=%d hash(801)=%d search(811)=%d\n", CAPACITY, hash(801), search(table, 811)); return 0; }
