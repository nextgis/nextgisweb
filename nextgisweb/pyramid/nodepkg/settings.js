/** @entrypoint */
import { route } from "./api";
import { callingComponent, LoaderCache } from "./util/loader";

const cache = new LoaderCache();

export const normalize = callingComponent;

export function load(component, require, ready) {
    if (component == "") {
        const msg = "No identifier was given while importing settings!";
        console.error(new Error(msg));
        ready({});
    }

    const loader = () => {
        return route("pyramid.settings")
            .get({ query: { component: component } })
            .catch((error) => {
                const msg = `Failed to load settings of "${component}"!`;
                console.error(msg, error);
                throw error;
            });
    };

    cache.promiseFor(component, loader).then(ready, () => ready({}));
}
