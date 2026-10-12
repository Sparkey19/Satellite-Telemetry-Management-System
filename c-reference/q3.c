#include <stdio.h>
#define MAX 8
int main(void) { int stack[MAX], top = 0; stack[top++] = 301; stack[top++] = 302; stack[top++] = 303; printf("Stack push/pop: %d\n", stack[--top]); printf("remaining top: %d\n", stack[top - 1]); return 0; }
