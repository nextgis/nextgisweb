type RequestFunc = (opt: { signal: AbortSignal }) => Promise<unknown>;
type Abort = () => void;

type AbortableRequest = {
    request: RequestFunc;
    abort?: Abort;
    abortController: AbortController;
};

interface RequestQueueOptions {
    /** Concurrent requests count */
    limit?: number;
    /** Time in ms */
    debounce?: number;
}

export class RequestQueue {
    private queue: AbortableRequest[] = [];
    private activeRequests: AbortableRequest[] = [];
    private limit: number;
    private timeoutId?: ReturnType<typeof setTimeout>;
    private debounce: number;

    constructor({ limit = 1, debounce = 0 }: RequestQueueOptions = {}) {
        this.limit = limit;
        this.debounce = debounce;
    }

    add(request: RequestFunc, abort?: Abort) {
        this.queue.push({
            request,
            abort,
            abortController: new AbortController(),
        });
        this.debouncedNext();
    }

    abort() {
        for (const q of [...this.queue, ...this.activeRequests]) {
            q.abortController.abort("The queue was cleaned");
            if (q.abort) {
                q.abort();
            }
        }
        this.queue.length = 0;
        this.activeRequests.length = 0;

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
        while (
            this.activeRequests.length < this.limit &&
            this.queue.length > 0
        ) {
            const requestItem = this.queue.shift()!;
            const { request, abortController } = requestItem;

            if (!abortController.signal.aborted) {
                this.activeRequests.push(requestItem);

                request({ signal: abortController.signal }).finally(() => {
                    this.activeRequests = this.activeRequests.filter(
                        (req) => req !== requestItem
                    );
                    this.debouncedNext();
                });
            } else {
                this.debouncedNext();
            }
        }
    }
}
