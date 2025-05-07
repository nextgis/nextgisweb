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

export const QUEUE_ABORT_REASON = "The queue was cleaned";

export class RequestQueue {
    private queue: AbortableRequest[] = [];
    private activeRequests: AbortableRequest[] = [];
    private limit: number;
    private timeoutId?: ReturnType<typeof setTimeout>;
    private debounce: number;

    private idleResolvers: Array<() => void> = [];

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
            q.abortController.abort(QUEUE_ABORT_REASON);
            if (q.abort) {
                q.abort();
            }
        }
        this.queue.length = 0;
        this.activeRequests.length = 0;
        this._clearTimeout();

        this.checkIdle();
    }

    waitAll(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.isIdle()) {
                resolve();
            } else {
                this.idleResolvers.push(resolve);
            }
        });
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
                    this.checkIdle();
                    this.debouncedNext();
                });
            } else {
                this.debouncedNext();
            }
        }
    }

    private isIdle(): boolean {
        return this.queue.length === 0 && this.activeRequests.length === 0;
    }

    private checkIdle() {
        if (this.isIdle()) {
            this.idleResolvers.forEach((resolve) => resolve());
            this.idleResolvers = [];
        }
    }
}
