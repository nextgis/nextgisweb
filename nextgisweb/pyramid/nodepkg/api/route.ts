import set from "lodash-es/set";

import routeData from "@nextgisweb/pyramid/api/load!/api/component/pyramid/route";

import { request } from "./request";
import type {
    RequestMethod,
    RequestOptions,
    ResponseType,
    RouteName,
    RouteParameters,
    RouteQuery,
    RouteResp,
    RouteResults,
    ToReturn,
} from "./type";

// ReExport for backward compatibility
export * from "./LunkwillParam";

export function routeURL<N extends RouteName>(
    name: N,
    ...rest: RouteParameters[N]
): string {
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

/* Ideas for future improvements:

- Implement getBlob, postBlob, and maybe getLunkwillUrl
- Use Extract in generics instead of replacement
- Response properties: route().get().then((data, {statusCode, ...etc}) => ...)
- Strict validation of query parameters

*/

export function route<N extends RouteName>(
    name: N,
    ...rest: RouteParameters[N]
): RouteResults<N> {
    const template = routeURL(name, ...rest);
    const result = {} as RouteResults<N>;
    const methods: RequestMethod[] = ["get", "post", "put", "delete", "patch"];
    for (const method of methods) {
        const methodResp = <
            T = RouteResp<N, typeof method>,
            RT extends ResponseType = "json",
            RU extends boolean = false,
        >(
            requestOptions?: RequestOptions<
                RT,
                RU,
                RouteQuery<N, typeof method>
            >
        ): Promise<ToReturn<T, RT, RU>> =>
            request<T, RT, RU>(template, {
                ...requestOptions,
                method,
            });
        // Using 'unknown' for type assertion because all methods are actually written to 'result'
        (result[method] as unknown) = methodResp;
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
