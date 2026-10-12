CC ?= cc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -O2
# q1 Array, q2 LinkedList, q3 Stack, q4 CircularQueue,
# q5 BST, q6 weighted Graph, q7 sort/search, q8 hash table.
PROGRAMS = q1 q2 q3 q4 q5 q6 q7 q8

all: $(PROGRAMS)

$(PROGRAMS): %: %.c
	$(CC) $(CFLAGS) $< -o $@

clean:
	$(RM) $(PROGRAMS) $(addsuffix .exe,$(PROGRAMS))

.PHONY: all clean
