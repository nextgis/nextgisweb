export class LoaderCache {
    constructor() {
        this.promises = {};
    }

    promiseFor(key, loader) {
        let promise = this.promises[key];
        if (promise === undefined) {
            promise = loader();
            this.promises[key] = promise;
            promise.catch(() => {
                delete this.promises[key];
            });
        }
        return promise;
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
    //         `with "@nextgisweb/pyramid/i18n!" in "${abs}".`
    //     );
    // }

    if (arg === "") {
        return component;
    } else {
        return arg;
    }
}
