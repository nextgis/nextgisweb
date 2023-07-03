export class LoaderCache {
    constructor() {
        this.promises = {};
    }

    fulfilled(key) {
        return this.promises[key]?.fulfilled;
    }

    resolve(key) {
        return this.promises[key]?.loader;
    }

    promiseFor(key, loader) {
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

    clean(key = null) {
        if (key) {
            delete this.promises[key];
        } else {
            this.promises = {};
        }
    }
}

export function callingComponent(arg, toAbsMid) {
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
