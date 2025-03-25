import { makeAbortError } from "../error/util";

import { sleep } from "./sleep";

interface ExecuteWithMinDelayOptions<T> {
    /**
     * Minimum delay in milliseconds
     * @default 1000
     */
    minDelay?: number;
    onRealExecute?: (val: T) => void;
    signal?: AbortSignal;
}

/**
 * Executes a given promise and ensures the total execution time meets the specified minimum delay.
 *
 * @remarks
 * Useful for preventing flicker in interfaces when requests complete too quickly.
 *
 * @example
 * ```javascript
 * const result = await executeWithMinDelay(
 *   fetchDataFromAPI(),
 *   { minDelay: 1500, signal: abortcontroller.signal }
 * );
 * ```
 */
export async function executeWithMinDelay<T>(
    requestPromise: Promise<T>,
    { minDelay = 1000, onRealExecute, signal }: ExecuteWithMinDelayOptions<T>
): Promise<T> {
    if (signal?.aborted) throw makeAbortError();

    const abortPromise = new Promise<never>((_, reject) =>
        signal?.addEventListener("abort", () => {
            reject(makeAbortError());
        })
    );

    const [result] = await Promise.race([
        Promise.all([
            requestPromise.then((res) => {
                if (onRealExecute) {
                    onRealExecute(res);
                }
                return res;
            }),
            sleep(minDelay),
        ]),
        abortPromise,
    ]);
    return result;
}
