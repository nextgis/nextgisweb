import type {
    GetRouteParam,
    RequestOptionsByMethod,
    ResponseType,
    RouteName,
    RouteQuery,
} from "../api/type";

export type UseRouteParams = Record<string, string | number>;

export interface UseRouteGetParams<
    N extends RouteName = RouteName,
    RT extends ResponseType = "json",
> {
    name: N;
    params?: GetRouteParam<N>;
    options?: RequestOptionsByMethod<"get", RouteQuery<N, "get">, never, RT>;
    loadOnInit?: boolean;
}
