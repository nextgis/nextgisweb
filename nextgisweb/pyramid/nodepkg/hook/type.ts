import type { RequestOptions, RouteName } from "../api/type";

export type UseRouteParams = Record<string, string | number>;

export interface UseRouteGetParams {
    name: RouteName;
    params?: UseRouteParams;
    options?: RequestOptions;
    loadOnInit?: boolean;
}
