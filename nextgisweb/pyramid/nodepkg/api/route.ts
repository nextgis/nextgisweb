import set from "lodash-es/set";

import routeData from "@nextgisweb/pyramid/api/load!/api/component/pyramid/route";

import { request } from "./request";

// ReExport for backward compatibility
export * from "./LunkwillParam";

import type {
    UndefinedRoutes,
    RequestMethod,
    RequestOptions,
    RouteResults,
    RouteName,
    ToReturn,
} from "./type";
import { RouteParameters, RouteParametersArray } from "./route.inc";

export function routeURL<N extends UndefinedRoutes>(name: N): string;
export function routeURL<N extends RouteName>(
    name: N,
    params: RouteParameters[N]
): string;
export function routeURL<N extends RouteName>(
    name: N,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: RouteParametersArray[N] extends any[]
        ? RouteParametersArray[N]
        : never
): string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeURL<N extends RouteName>(name: N, ...rest: any[]): string {
    const [template, ...params] = routeData[name];
    const first = rest[0];

    let sub: string[];
    if (first === undefined) {
        sub = [];
    } else if (typeof first === "object" && first !== null) {
        if (rest.length > 1) {
            throw new Error("Too many arguments for route(name, object)!");
        }
        sub = [];
        for (const [p, v] of Object.entries(first)) {
            sub[params.indexOf(p)] = String(v);
        }
    } else {
        sub = rest.map((v) => String(v));
    }

    return template.replace(/\{(\w+)\}/g, function (m, a) {
        const idx = parseInt(a);
        const value = sub[idx];
        if (value === undefined) {
            const msg = `Undefined parameter ${idx} in "${template}".`;
            throw new Error(msg);
        }
        return String(value);
    });
}

export function route<N extends UndefinedRoutes>(name: N): RouteResults;
export function route<N extends RouteName>(
    name: N,
    params: RouteParameters[N]
): RouteResults;
export function route<N extends RouteName>(
    name: N,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: RouteParametersArray[N] extends any[]
        ? RouteParametersArray[N]
        : never
): RouteResults;
export function route<N extends RouteName>(
    name: N,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: RouteParametersArray[N] extends any[]
        ? RouteParametersArray[N]
        : never
): RouteResults {
    const template = routeURL(name, ...rest);
    const result = {} as RouteResults;
    const methods: RequestMethod[] = ["get", "post", "put", "delete"];
    for (const method of methods) {
        result[method] = <T = unknown, B extends boolean = false>(
            requestOptions?: RequestOptions<B>
        ): Promise<ToReturn<T, B>> =>
            request<T, B>(template, {
                ...requestOptions,
                method: method.toUpperCase() as Uppercase<RequestMethod>,
            });
    }
    return result;
}

export const compatRoute = {};

// Because both keys "feature_layer.store"
// exist functions should be created in alphabetical order.
for (const key of Object.keys(routeData).sort()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (...args: any[]) => {
        if (ngwConfig.debug) {
            const msg =
                `Module "ngw-pyramid/route" has been deprecated! Use ` +
                `routeURL() or route() from "@nextgisweb/pyramid/api" instead.`;
            console.warn(new Error(msg));
        }
        // We don't care about types in legacy code
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return routeURL(key as any, ...args);
    };
    set(compatRoute, key, fn);
}
