/** @entrypoint */
import { LoaderCache } from "../util/loader";

import { request } from "./request";

const cache = new LoaderCache();

export function load(
    path: string,
    _require: unknown,
    ready: (...args: unknown[]) => void
) {
    const loader = () => {
        return request(path).catch((error) => {
            console.error(`Failed to fetch "${path}"`, error);
            throw error;
        });
    };

    cache.promiseFor(path, loader).then(ready, () => ready(undefined));
}
