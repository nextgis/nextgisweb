/**
 * Pauses execution for a given number of milliseconds
 *
 * @param {number} time - The number of milliseconds to pause for. Defaults to 300.
 * @returns {Promise} A promise that resolves after the given time.
 *
 * @example
 *  import {}
 *
 *  async function sleepExample() {
 *     console.log('Start');
 *     await sleep(500);
 *     console.log('Pause for 500ms');
 *     console.log('Done');
 *  }
 */
export function sleep(time: number = 300): Promise<unknown> {
    return new Promise((res) => {
        setTimeout(res, time);
    });
}
