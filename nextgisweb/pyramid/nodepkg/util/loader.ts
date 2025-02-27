interface PromiseDef<T = unknown> {
    fulfilled: boolean;
    loader: Promise<T>;
}

export class LoaderCache<T = unknown> {
    promises: Record<string, PromiseDef<T>> = {};

    constructor() {
        this.promises = {};
    }

    fulfilled(key: string): boolean {
        return this.promises[key]?.fulfilled;
    }

    resolve(key: string): Promise<T> {
        return this.promises[key]?.loader;
    }

    promiseFor(key: string, loader: () => Promise<T>) {
        let promise = this.promises[key];
        if (promise === undefined) {
            promise = {
                fulfilled: false,
                loader: loader(),
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
