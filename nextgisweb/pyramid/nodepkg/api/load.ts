/** @entrypoint */
import { LoaderCache } from "../util/loader";

import { request } from "./request";

const cache = new LoaderCache();

export function load(
    path: string,
    require: unknown,
    ready: (...args: unknown[]) => void
) {
    const loader = () => {
        return request(path).catch((error) => {
            const msg = "Failed to load " + path;

            const loaderError = new Error(msg);
            Object.assign(loaderError, {
                src: "dojoLoader",
                info: [path],
            });

            // Dojo AMD loader timeout error still occurs, but Sentry will
            // capture an error resembling a Dojo loader error and will cease
            // processing future events.
            // @ts-expect-error Dojo AMD events API
            require.signal("error", loaderError);

            throw error;
        });
    };

    cache.promiseFor(path, loader).then(ready);
}
