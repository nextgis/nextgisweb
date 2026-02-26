interface PromiseDef<T = unknown, M = unknown> {
    fulfilled: boolean;
    loader: Promise<T>;
    meta?: M;
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

    promiseFor(key: string, loader: () => Promise<T>, meta?: M) {
        let promise = this.promises[key];
        if (promise === undefined) {
            promise = {
                fulfilled: false,
                loader: loader(),
                meta,
            };
            promise.loader
                .then((result) => {
                    this.promises[key].fulfilled = true;
                    return result;
                })
                .catch(() => {
                    // The AbortControl signal may be triggered after successful execution
                    if (!this.fulfilled(key)) {
                        delete this.promises[key];
                    }
                });
            this.promises[key] = promise;
        }
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
