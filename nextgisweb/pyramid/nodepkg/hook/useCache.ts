import { useEffect, useMemo, useReducer } from "react";

import { isAbortError } from "@nextgisweb/gui/error";
import { arraySequenceIndexer } from "@nextgisweb/gui/util";

export type CacheObject<V> =
    | { readonly status: "missing" }
    | { readonly status: "loading"; readonly promise: Promise<V> }
    | { readonly status: "error"; readonly error: unknown }
    | { readonly status: "ready"; readonly data: V };

const MISSING: CacheObject<never> = { status: "missing" };

export type CacheStatus = CacheObject<never>["status"];

type Args = unknown[];
type Result = NonNullable<unknown> | null;

interface UseCacheFnOpts {
    /** Abort signal for canceling request */
    signal: AbortSignal;
}

type UseCacheFn<A extends Args, R extends Result> = (
    args: A,
    opts: UseCacheFnOpts
) => Promise<R>;

interface UseCacheHookOpts {
    /** If set, no new calculations will be made */
    cachedOnly?: boolean;
}

type UseCacheHook<A extends Args, R extends Result> = (
    args: A,
    opts?: UseCacheHookOpts
) => CacheObject<R>;

/** Hook for caching request results and cancelation
 *
 * @template A - Type of arguments passed to cached function
 * @template R - Type of the result returned by function
 *
 * @param fn - Function to be cached
 * @returns Hook function that manages the cache
 */
export function useCache<
    A extends unknown[],
    R extends NonNullable<unknown> | null,
>(fn: UseCacheFn<A, R>): UseCacheHook<A, R> {
    const { index } = useMemo(() => arraySequenceIndexer<A>(), []);
    const cache = useMemo<Record<number, [CacheObject<R>]>>(() => ({}), []);

    // TODO: Rerender only if relevant elements updated
    const rerender = useReducer((i) => i + 1, 0)[1];

    const abort = useMemo(() => new AbortController(), []);
    useEffect(() => () => abort.abort("Unmounted"), [abort]);

    const fetch = (args: A, opts: UseCacheHookOpts = {}) => {
        const id = index(args);
        let record = cache[id];
        let promise: Promise<R> | undefined;

        if (record === undefined) {
            if (!opts.cachedOnly) {
                promise = fn(args, { signal: abort.signal });
                record = [{ status: "loading" as const, promise }];
            } else {
                record = [MISSING];
            }
            cache[id] = record;
        } else if (!opts.cachedOnly && record[0].status === "missing") {
            promise = fn(args, { signal: abort.signal });
            record[0] = { status: "loading" as const, promise };
            rerender();
        }

        if (promise) {
            promise.then((data) => {
                record[0] = { status: "ready" as const, data };
                rerender();
            });
            promise.catch((error) => {
                if (isAbortError(error)) {
                    delete cache[id];
                } else {
                    record[0] = { status: "error" as const, error };
                    rerender();
                }
            });
        }

        return record[0];
    };

    return fetch;
}
