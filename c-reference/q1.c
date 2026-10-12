#include <stdio.h>
#define CAPACITY 4
typedef struct { int packetID; int batteryStatus; } Packet;
int main(void) {
    Packet packets[CAPACITY] = {{101, 95}, {102, 88}, {103, 91}};
    size_t count = 3;
    packets[count++] = (Packet){104, 86};
    printf("Array packets (%zu/%d):\n", count, CAPACITY);
    for (size_t i = 0; i < count; ++i) printf("  packetID=%d battery=%d%%\n", packets[i].packetID, packets[i].batteryStatus);
    return 0;
}
