export class LoaderCache {
    constructor() {
        this.promises = {};
        this.errors = {};
    }

    promiseFor(key, loader) {
        let promise = this.promises[key];
        if (promise === undefined) {
            promise = loader();
            this.promises[key] = promise;
        }
        return promise;
    }
}

export function callingComponent(arg, toAbsMid) {
    const abs = toAbsMid(".");
    const parts = abs.split("/");
    const component = ((parts[0] == "@nextgisweb") ? parts[1] : (
        parts[0].replace(/^ngw-/, "").replace("-", "_"))).replace(".", "");

    // if (component == req) {
    //     console.debug(
    //         `Consider to replace "@nextgisweb/pyramid/i18n!${req}" ` +
    //         `with "@nextgisweb/pyramid/i18n!" in "${abs}".`
    //     );
    // }

    if (arg == "") {
        return component;
    } else {
        return arg;
    }
}
