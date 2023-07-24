export interface QueryOptions {
    signal?: AbortSignal;
}

export type ApiRouteParams = Record<string, string>;

export interface GetQueryOptions extends QueryOptions {
    cache?: boolean;
}
