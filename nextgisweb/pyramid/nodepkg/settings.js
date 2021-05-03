/** @entrypoint */
import { route } from "./api";
import { callingComponent, LoaderCache } from "./util/loader";

const cache = new LoaderCache();

export const normalize = callingComponent;

export function load(component, require, ready) {
    if (component == "") {
        console.error(new Error(
            "No component identifier was given while importing " +
            "component settings!"));
        ready({});
    }

    const loader = () => {
        return route('pyramid.settings').get(
            { query: { component: component } }
        ).catch( error => {
            console.error(`Failed to load settings of "${component}"!`, error);
            throw error;
        })
    }

    cache.promiseFor(component, loader).then(ready, () => ready({}));
}
