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

export function callingComponent(
    arg: string,
    toAbsMid: (val: string) => string
) {
    const abs = toAbsMid(".");
    const parts = abs.split("/");
    const component = (
        parts[0] === "@nextgisweb" ? parts[1] : parts[0].replace(/^ngw-/, "")
    )
        .replace(/-/g, "_")
        .replace(".", "");

    // if (component == req) {
    //     console.debug(
    //         `Consider to replace "@nextgisweb/pyramid/i18n!${req}" ` +
    //         `with "@nextgisweb/pyramid/i18n" in "${abs}".`
    //     );
    // }

    if (arg === "") {
        return component;
    } else {
        return arg;
    }
}
