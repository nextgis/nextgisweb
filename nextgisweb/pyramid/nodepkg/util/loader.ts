interface PromiseDef<T = unknown, M = unknown> {
  fulfilled: boolean;
  loader: Promise<T>;
  meta?: M;
}

interface PromiseForOptions<M> {
  meta?: M;
  signal?: AbortSignal | null;
}

export class LoaderCache<T = unknown, M = unknown> {
  promises: Record<string, PromiseDef<T, M>> = {};

  constructor() {
    this.promises = {};
  }

  has(key: string): boolean {
    return this.promises[key] !== undefined;
  }

  get(key: string): PromiseDef<T, M> {
    return this.promises[key];
  }

  fulfilled(key: string): boolean {
    return this.promises[key]?.fulfilled;
  }

  resolve(key: string): Promise<T> {
    return this.promises[key]?.loader;
  }

  promiseFor(
    key: string,
    loader: () => Promise<T>,
    { meta, signal }: PromiseForOptions<M> = {}
  ) {
    const cached = this.promises[key];
    if (cached !== undefined) {
      return cached.loader;
    }

    const promise: PromiseDef<T, M> = {
      fulfilled: false,
      loader: loader(),
      meta,
    };
    this.promises[key] = promise;

    const clean = () => {
      if (this.promises[key] === promise && !this.fulfilled(key)) {
        delete this.promises[key];
      }
    };
    if (signal?.aborted) {
      clean();
    } else {
      signal?.addEventListener("abort", clean, { once: true });
    }

    promise.loader.then(() => {
      promise.fulfilled = true;
    }, clean);

    return promise.loader;
  }

  clean(key: string | null = null) {
    if (key) {
      delete this.promises[key];
    } else {
      this.promises = {};
    }
  }
}
