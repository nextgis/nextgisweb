/**
 * Helper class for managing multiple AbortControllers.
 *
 * @example
 *
 * // Create a new instance of the helper.
 * const helper = new AbortControllerHelper();
 *
 * // Create new signals for requests.
 * const signal1 = helper.makeSignal();
 * const signal2 = helper.makeSignal();
 *
 * // Use the signals for fetch requests.
 * route('resource.blueprint').get({ signal: signal1 });
 * fetch(url, { signal: signal2 });
 *
 * // Later, if needed, abort all requests managed by the helper.
 * helper.abort();
 *
 * // Check if there are any active signals.
 * console.log(helper.empty); // outputs: true
 */
export class AbortControllerHelper {
    private _controllers: AbortController[] = [];

    /**
     * Creates and returns a new AbortSignal.
     *
     * @returns {AbortSignal} A new AbortSignal.
     */
    makeSignal(): AbortSignal {
        const controller = new AbortController();
        this._controllers.push(controller);
        return controller.signal;
    }

    /**
     * Aborts all active AbortControllers and clears the list.
     */
    abort() {
        for (const controller of this._controllers) {
            controller.abort();
        }
        this._controllers.length = 0;
    }

    /**
     * Checks if there are no active AbortControllers.
     *
     * @returns {boolean} True if there are no active AbortControllers, otherwise false.
     *
     */
    get empty(): boolean {
        return this._controllers.length === 0;
    }
}
