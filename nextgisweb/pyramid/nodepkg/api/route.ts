import { generateUrl, request } from "./request";
import routeData from "./route.inc";
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
    const result = {
        url: (
            opt?: Pick<
                RequestOptions<ResponseType, false, RouteQuery<N, "get">>,
                "query"
            >
        ) => {
            return generateUrl(template, opt?.query);
        },
    } as RouteResults<N>;
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
