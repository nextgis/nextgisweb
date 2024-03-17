/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Routes } from "@nextgisweb/pyramid/type/route";

import type { LoaderCache } from "../util/loader";

import type { LunkwillParam } from "./LunkwillParam";

export type RouteParameters = {
    [K in keyof Routes]: Routes[K]["pathArr"] | [Routes[K]["pathObj"]];
};

export type RouteName = keyof RouteParameters;

export type GetRouteParam<R extends RouteName> = (RouteParameters[R] &
    [object])[0];

// eslint-disable-next-line no-use-before-define
export type RequestMethod = keyof RouteMethods<RouteName>;

export type Method = RequestMethod | Uppercase<RequestMethod>;

export type ResponseType = "blob" | "json";

export interface RequestOptions<
    RT extends ResponseType = "json",
    ReturnUrl extends boolean = false,
    Q = any,
    B = string | null | boolean | Record<string, any> | any[],
> {
    method?: Method;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    cache?: boolean | LoaderCache;
    query?: Q;
    json?: B;
    /** Has lower priority than the json */
    body?: string;
    global?: boolean;
    signal?: AbortSignal;
    responseType?: RT;
    lunkwill?: LunkwillParam;
    lunkwillReturnUrl?: ReturnUrl;
}

export interface GetRequestOptions<
    Q = any,
    RT extends ResponseType = "json",
    ReturnUrl extends boolean = false,
> extends Omit<RequestOptions<RT, ReturnUrl, Q>, "json" | "body"> {
    method?: "GET";
}
export interface RequestOptionsJSON<
    Q = any,
    B = string | null | boolean | Record<string, any> | any[],
    RT extends ResponseType = "json",
    M extends Method = Method,
> extends Omit<RequestOptions<RT, false, Q, B>, "json" | "body"> {
    json: B;
    method?: M;
}

export interface RequestOptionsBoby<
    Q = any,
    RT extends ResponseType = "json",
    M extends Method = Method,
> extends Omit<RequestOptions<RT, false, Q>, "json" | "body"> {
    body: string;
    method?: M;
}

export type PutRequestOptions<
    Q = any,
    B = any,
    RT extends ResponseType = "json",
> = RequestOptionsJSON<Q, B, RT, "PUT"> | RequestOptionsBoby<Q, RT, "PUT">;

export type PostRequestOptions<
    Q = any,
    B = any,
    RT extends ResponseType = "json",
> = RequestOptionsJSON<Q, B, RT, "PUT"> | RequestOptionsBoby<Q, RT, "PUT">;

export type PatchRequestOptions<
    Q = any,
    B = any,
    RT extends ResponseType = "json",
> = RequestOptionsJSON<Q, B, RT, "PATCH"> | RequestOptionsBoby<Q, RT, "PATCH">;

export type DeleteRequestOptions<
    Q = any,
    RT extends ResponseType = "json",
> = RequestOptions<RT, false, Q>;

export interface RouteRequestOptions<
    Q = any,
    B = any,
    RT extends ResponseType = "json",
    ReturnUrl extends boolean = false,
> {
    get: GetRequestOptions<Q, RT, ReturnUrl>;
    post: PostRequestOptions<Q, B, RT>;
    put: PutRequestOptions<Q, B, RT>;
    patch: PatchRequestOptions<Q, RT>;
    delete: DeleteRequestOptions<Q, RT>;
}

export type RequestOptionsByMethod<
    M extends RequestMethod,
    Q = any,
    B = any,
    RT extends ResponseType = "json",
    ReturnUrl extends boolean = false,
> = RouteRequestOptions<Q, B, RT, ReturnUrl>[M];

export type ApiRouteParams = Record<string, string>;

export interface LunkwillData {
    status?: string;
    delay_ms?: number;
}

export type RouteResp<
    N extends RouteName,
    M extends RequestMethod,
> = N extends keyof Routes
    ? M extends keyof Routes[N]
        ? "response" extends keyof Routes[N][M]
            ? Routes[N][M]["response"]
            : never
        : never
    : never;

export type RouteQuery<
    N extends RouteName,
    M extends RequestMethod,
> = N extends keyof Routes
    ? M extends keyof Routes[N]
        ? "query" extends keyof Routes[N][M]
            ? Routes[N][M]["query"]
            : any
        : never
    : never;

export type RouteBody<
    N extends RouteName,
    M extends RequestMethod,
> = N extends keyof Routes
    ? M extends keyof Routes[N]
        ? "body" extends keyof Routes[N][M]
            ? Routes[N][M]["body"]
            : any
        : never
    : never;

export type ToReturn<
    T = unknown,
    RT extends ResponseType = "json",
    ReturnUrl extends boolean = false,
> = ReturnUrl extends true ? string : RT extends "blob" ? Blob : T;

type HasRequiredKeys<T> = {
    [P in keyof T]-?: object extends Pick<T, P> ? never : P;
}[keyof T] extends never
    ? false
    : true;

export interface RouteMethods<N extends RouteName> {
    get: HasRequiredKeys<RouteQuery<N, "get">> extends true
        ? <
              T = RouteResp<N, "get">,
              RT extends ResponseType = "json",
              B extends boolean = false,
          >(
              options: RequestOptionsByMethod<
                  "get",
                  RouteQuery<N, "get">,
                  any,
                  RT,
                  B
              >
          ) => Promise<ToReturn<T, RT, B>>
        : <
              T = RouteResp<N, "get">,
              B extends boolean = false,
              RT extends ResponseType = "json",
          >(
              options?: RequestOptionsByMethod<
                  "get",
                  RouteQuery<N, "get">,
                  any,
                  RT,
                  B
              >
          ) => Promise<ToReturn<T, RT, B>>;
    post: <T = RouteResp<N, "post">, RT extends ResponseType = "json">(
        options: RequestOptionsByMethod<
            "post",
            RouteQuery<N, "post">,
            RouteBody<N, "post">,
            RT
        >
    ) => Promise<ToReturn<T, RT>>;
    put: <T = RouteResp<N, "put">, RT extends ResponseType = "json">(
        options: RequestOptionsByMethod<
            "put",
            RouteQuery<N, "put">,
            RouteBody<N, "put">,
            RT
        >
    ) => Promise<ToReturn<T, RT>>;
    patch: <T = RouteResp<N, "patch">, RT extends ResponseType = "json">(
        options: RequestOptionsByMethod<
            "patch",
            RouteQuery<N, "patch">,
            RouteBody<N, "patch">,
            RT
        >
    ) => Promise<ToReturn<T, RT>>;
    delete: HasRequiredKeys<RouteQuery<N, "delete">> extends true
        ? <T = RouteResp<N, "delete">>(
              options: RequestOptionsByMethod<"delete", RouteQuery<N, "delete">>
          ) => Promise<ToReturn<T>>
        : <T = RouteResp<N, "delete">>(
              options?: RequestOptionsByMethod<
                  "delete",
                  RouteQuery<N, "delete">
              >
          ) => Promise<ToReturn<T>>;
}
export type MethodAvailable<
    N extends RouteName,
    M extends RequestMethod,
> = M extends keyof Routes[N] ? RouteMethods<N>[M] : never;

export type RouteResults<N extends RouteName> = {
    [M in keyof RouteMethods<any>]: MethodAvailable<N, M>;
};

export type KeysWithMethods<Methods extends RequestMethod[]> = {
    [K in keyof Routes]: Methods extends (keyof Routes[K])[] ? K : never;
}[keyof Routes];

type PathKeys = any;

export type KeysWithPaths<P extends PathKeys> = {
    [K in keyof Routes]: P extends Array<keyof Routes[K]["pathObj"]>
        ? K
        : never;
}[keyof Routes];

export type KeysWithMethodAndPath<
    M extends RequestMethod[],
    P extends PathKeys,
> = {
    [K in keyof Routes]: K extends KeysWithMethods<M>
        ? K extends KeysWithPaths<P>
            ? K
            : never
        : never;
}[keyof Routes];
