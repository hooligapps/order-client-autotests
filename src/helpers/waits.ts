export function timeoutMessage(description: string, timeoutMs: number): string {
  return `${description} was not observed within ${timeoutMs}ms`;
}
