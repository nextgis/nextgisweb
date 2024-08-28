type RequestFunc = () => Promise<unknown>;
type Abort = () => void;
type AbortableRequest = {
    request: RequestFunc;
    abort?: Abort;
};

interface RequestQueueOptions {
    /** Concurrent requests count */
    limit?: number;
    /** Time in ms */
    debounce?: number;
}

export class RequestQueue {
    private queue: AbortableRequest[] = [];

    private limit: number;
    private activeCount: number = 0;
    private timeoutId?: ReturnType<typeof setTimeout>;
    private debounce: number;

    constructor({ limit = 1, debounce = 0 }: RequestQueueOptions = {}) {
        this.limit = limit;
        this.debounce = debounce;
    }

    add(request: RequestFunc, abort?: () => void) {
        this.queue.push({ request: request, abort });
        this.debouncedNext();
    }

    abort() {
        for (const q of this.queue) {
            if (q.abort) {
                q.abort();
            }
        }
        this.queue = [];
        this._clearTimeout();
    }

    private debouncedNext() {
        this._clearTimeout();
        this.timeoutId = setTimeout(() => this._next(), this.debounce);
    }

    private _clearTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
    }

    private _next() {
        while (this.activeCount < this.limit && this.queue.length > 0) {
            const { request } = this.queue.shift()!;
            this.activeCount++;

            request().finally(() => {
                this.activeCount--;
                this.debouncedNext();
            });
        }
    }
}
