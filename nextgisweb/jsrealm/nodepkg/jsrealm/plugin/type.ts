export type ImportCallback<V> = (...args: []) => Promise<{ default: V }>;
