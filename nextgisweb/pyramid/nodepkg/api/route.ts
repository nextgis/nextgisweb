import set from "lodash-es/set";

import routeData from "@nextgisweb/pyramid/api/load!/api/component/pyramid/route";

import { request } from "./request";

// ReExport for backward compatibility
export * from "./LunkwillParam";

import type { RequestMethod, RouteResults } from "./type";

type UrlParamValue = string | number;
type RouteUrlOpt = Record<string, UrlParamValue>;
type RouteUrlOptOrArgs = (UrlParamValue | RouteUrlOpt)[];

export function routeURL(name: string, ...rest: RouteUrlOptOrArgs): string {
    const [template, ...params] = routeData[name];
    const first = rest[0];

    let sub: UrlParamValue[];
    if (first === undefined) {
        sub = [];
    } else if (typeof first === "object" && first !== null) {
        if (rest.length > 1) {
            throw new Error("Too many arguments for route(name, object)!");
        }
        sub = [];
        for (const [p, v] of Object.entries(first)) {
            sub[params.indexOf(p)] = v;
        }
    } else {
        sub = rest as UrlParamValue[];
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

export function route(name: string, options: RouteUrlOpt): RouteResults;
export function route(name: string, ...rest: UrlParamValue[]): RouteResults;

export function route(name: string, ...rest: RouteUrlOptOrArgs): RouteResults {
    const template = routeURL(name, ...rest);
    const result = {} as RouteResults;
    const methods: RequestMethod[] = ["get", "post", "put", "delete"];
    for (const method of methods) {
        result[method] = (options) =>
            request(template, {
                ...options,
                method: method.toUpperCase() as Uppercase<RequestMethod>,
            });
    }
    return result;
}

export const compatRoute = {};

// Because both keys "feature_layer.store"
// exist functions should be created in alphabetical order.
for (const key of Object.keys(routeData).sort()) {
    const fn = (...args: RouteUrlOptOrArgs) => {
        if (ngwConfig.debug) {
            const msg =
                `Module "ngw-pyramid/route" has been deprecated! Use ` +
                `routeURL() or route() from "@nextgisweb/pyramid/api" instead.`;
            console.warn(new Error(msg));
        }
        return routeURL(key, ...args);
    };
    set(compatRoute, key, fn);
}
