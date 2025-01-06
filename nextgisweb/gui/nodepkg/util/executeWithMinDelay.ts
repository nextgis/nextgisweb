import { sleep } from "./sleep";

/**
 * Executes a given promise and ensures the total execution time meets the specified minimum delay.
 *
 * @remarks
 * Useful for preventing flicker in interfaces when requests complete too quickly.
 *
 * @template T - The type of the resolved value of the promise.
 * @param {Promise<T>} requestPromise - The promise to execute.
 * @param {number} [minDelay=1000] - Minimum delay in milliseconds.
 * @returns {Promise<T>} A promise that resolves with the result of `requestPromise` after the minimum delay.
 *
 * @example
 * ```javascript
 * const result = await executeWithMinDelay(
 *   fetchDataFromAPI(),
 *   1500
 * );
 * ```
 */
export async function executeWithMinDelay<T>(
    requestPromise: Promise<T>,
    minDelay: number = 1000
): Promise<T> {
    const [result] = await Promise.all([requestPromise, sleep(minDelay)]);
    return result;
}
