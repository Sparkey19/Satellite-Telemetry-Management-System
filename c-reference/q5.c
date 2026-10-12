#include <stdio.h>
typedef struct { int missionID; int timestamp; } Log;
static void insert(Log *tree, int *n, Log value) { int i = 0; while (tree[i].timestamp) i = value.timestamp < tree[i].timestamp ? i * 2 + 1 : i * 2 + 2; tree[i] = value; ++*n; }
static void inorder(const Log *tree, int i) { if (!tree[i].timestamp) return; inorder(tree, i * 2 + 1); printf("%d@%d ", tree[i].missionID, tree[i].timestamp); inorder(tree, i * 2 + 2); }
int main(void) { Log tree[32] = {0}; int n = 0; insert(tree, &n, (Log){501, 30}); insert(tree, &n, (Log){502, 20}); insert(tree, &n, (Log){503, 40}); printf("BST in-order: "); inorder(tree, 0); putchar('\n'); return 0; }
