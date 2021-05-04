import set from "lodash-es/set";

import { request } from "./request";
import routeData from "@nextgisweb/pyramid/api/load!/api/component/pyramid/route";

export function routeURL(name, ...rest) {
    const [template, ...params] = routeData[name];
    const first = rest[0];

    let sub;
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
        sub = rest;
    }

    return template.replace(/\{(\w+)\}/g, function (m, a) {
        const value = sub[parseInt(a)];
        if (value === undefined) {
            const msg = `Undefined parameter ${idx}:${keys[idx]} in ${template}.`;
            throw new Error(msg);
        }
        return value;
    });
}

export function route(name, ...rest) {
    const template = routeURL(name, ...rest);
    const result = {};
    for (const method of ["get", "post", "put", "delete"]) {
        result[method] = (options) =>
            request(
                template,
                Object.assign(options || {}, {
                    method: method.toUpperCase(),
                })
            );
    }
    return result;
}

export const compatRoute = {};

// Because both keys "feature_layer.store.item" and "feature_layer.store"
// exist functions should be created in alphabetical order.
for (const key of Object.keys(routeData).sort()) {
    const defn = routeData[key];
    const fn = (...args) => {
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
