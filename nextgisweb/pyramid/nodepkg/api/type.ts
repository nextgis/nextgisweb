import type { LoaderCache } from "../util/loader";
import type { LunkwillParam } from "./LunkwillParam";

export type RequestMethod = "get" | "post" | "put" | "delete";

export interface RequestOptions<ReturnUrl extends boolean = false> {
    method?: RequestMethod | Uppercase<RequestMethod>;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    cache?: boolean | LoaderCache;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json?: Record<string, any>;
    /** Has lower priority than the json */
    body?: string;

    global?: boolean;

    signal?: AbortSignal;

    lunkwill?: LunkwillParam;
    lunkwillReturnUrl?: ReturnUrl;
}

export type ApiRouteParams = Record<string, string>;

export interface LunkwillData {
    status?: string;
    delay_ms?: number;
}

export type ToReturn<
    T = unknown,
    ReturnUrl extends boolean = false,
> = ReturnUrl extends true ? string : T;

export interface RouteResults {
    get: <T = unknown, B extends boolean = false>(
        options?: RequestOptions<B>
    ) => Promise<ToReturn<T, B>>;
    post: <T = unknown, B extends boolean = false>(
        options?: RequestOptions<B>
    ) => Promise<ToReturn<T, B>>;
    put: <T = unknown, B extends boolean = false>(
        options?: RequestOptions<B>
    ) => Promise<ToReturn<T, B>>;
    delete: <T = unknown, B extends boolean = false>(
        options?: RequestOptions<B>
    ) => Promise<ToReturn<T, B>>;
}
