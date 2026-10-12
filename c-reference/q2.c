#include <stdio.h>
#include <stdlib.h>
typedef struct Node { int packetID; struct Node *next; } Node;
static void append(Node **head, int id) { Node *n = malloc(sizeof(*n)); n->packetID = id; n->next = NULL; if (!*head) { *head = n; return; } Node *p = *head; while (p->next) p = p->next; p->next = n; }
static int transmit(Node **head) { if (!*head) return -1; Node *n = *head; int id = n->packetID; *head = n->next; free(n); return id; }
int main(void) { Node *head = NULL; append(&head, 201); append(&head, 202); append(&head, 203); printf("LinkedList transmit: %d\n", transmit(&head)); while (head) { Node *n = head->next; free(head); head = n; } return 0; }
