import type { LoaderCache } from "../util/loader";
import type { LunkwillParam } from "./LunkwillParam";

export type RequestMethod = "get" | "post" | "put" | "delete";

export interface RequestOptions {
    method?: RequestMethod | Uppercase<RequestMethod>;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    cache?: boolean | LoaderCache;
    query?: Record<string, string | number | boolean>;
    json?: Record<string, unknown>;
    /** Has lower priority than the json */
    body?: string;

    global?: boolean;

    signal?: AbortSignal;

    lunkwill?: LunkwillParam;
    lunkwillReturnUrl?: boolean;
}

export type ApiRouteParams = Record<string, string>;

export interface LunkwillData {
    status?: string;
    delay_ms?: number;
}

export interface RouteResults {
    get: <T = unknown>(options: RequestOptions) => Promise<T>;
    post: <T = unknown>(options: RequestOptions) => Promise<T>;
    put: <T = unknown>(options: RequestOptions) => Promise<T>;
    delete: <T = unknown>(options: RequestOptions) => Promise<T>;
}
