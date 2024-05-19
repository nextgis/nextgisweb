/** @entrypoint */
import { route } from "./api";
import type { RouteQuery, RouteResp } from "./api/type";
import { LoaderCache, callingComponent } from "./util/loader";

type Component = RouteQuery<"pyramid.settings", "get">["component"];
type Data = RouteResp<"pyramid.settings", "get">;

const cache = new LoaderCache<Data>();

export const normalize = callingComponent;

export function load(
    component: Component,
    _require: unknown,
    ready: (data: Data) => void
) {
    const readyEsm = (data: Data) => ready({ _esModule: true, ...data });

    if (!component) {
        const msg = "No identifier was given while importing settings!";
        console.error(new Error(msg));
        readyEsm({});
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

    cache.promiseFor(component, loader).then(readyEsm, () => readyEsm({}));
}
