declare const __DEV__: boolean | undefined;
declare const console: { warn(...args: unknown[]): void };

export function warn(message: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[react-navigation-prune] ${message}`);
  }
}
