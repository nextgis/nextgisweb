import { GetQueryOptions } from "../api/type";
import type { RouterEntrypoint } from "../type";

export type UseRouteParams = Record<string, string | number>;

export interface UseRouteGetParams {
    name?: RouterEntrypoint;
    params?: UseRouteParams;
    options?: GetQueryOptions;
    loadOnInit?: boolean;
}
