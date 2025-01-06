/**
 * Sleep options
 */
interface SleepOptions {
    /**
     * Optional AbortSignal to cancel sleep
     * */
    signal?: AbortSignal;
}

/**
 * Pause execution for a given number of milliseconds
 *
 * @param ms Number of millisecods to sleep
 * @param opts Additional options
 *
 * @returns Promise that resolves after the given time
 *
 * @example
 *  async function sleepExample() {
 *     console.log('Start');
 *     await sleep(500);
 *     console.log('Done');
 *  }
 */
export function sleep(ms: number, opts: SleepOptions = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
        if (opts?.signal?.aborted) {
            reject(opts?.signal.reason);
        } else {
            const timeout = setTimeout(() => {
                resolve(undefined);
            }, ms);
            opts.signal?.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(opts.signal!.reason);
            });
        }
    });
}
