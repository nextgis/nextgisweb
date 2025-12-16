type RequestFunc = (opt: { signal: AbortSignal }) => Promise<unknown>;
type Abort = () => void;

type AbortableRequest = {
    id: string | number;
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
    readonly debounce: number;

    private timeoutId?: ReturnType<typeof setTimeout>;
    private resumeTimer?: ReturnType<typeof setTimeout>;

    private paused = false;
    private idleResolvers: Array<() => void> = [];

    constructor({ limit = 1, debounce = 0 }: RequestQueueOptions = {}) {
        this.limit = limit;
        this.debounce = debounce;
    }

    add(
        request: RequestFunc,
        options?: { abort?: Abort; id?: string | number }
    ) {
        const { abort, id } = options || {};
        if (id !== undefined && id !== null) {
            this.removeById(id);
        }
        const queueItem: AbortableRequest = {
            id: id ?? Math.random().toString(36).slice(2),
            request,
            abort,
            abortController: new AbortController(),
        };
        this.queue.push(queueItem);
        this.debouncedNext();
        return queueItem;
    }

    abort() {
        for (const q of [...this.queue, ...this.activeRequests]) {
            q.abortController.abort();
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

    pause(pauseDuration?: number) {
        this.paused = true;
        this._clearTimeout();
        this._clearResumeTimer();
        if (pauseDuration) {
            this.resumeTimer = setTimeout(() => this.resume(), pauseDuration);
        }
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this._clearResumeTimer();
        this._next();
    }

    private debouncedNext() {
        if (this.paused) return;
        this._clearTimeout();
        this.timeoutId = setTimeout(() => this._next(), this.debounce);
    }

    private _clearTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
    }

    private _clearResumeTimer() {
        if (this.resumeTimer) {
            clearTimeout(this.resumeTimer);
            this.resumeTimer = undefined;
        }
    }

    private _next() {
        if (this.paused) return;

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

    private removeById(id: number | string) {
        this.queue = this.queue.filter((item) => item.id !== id);
        const idx = this.activeRequests.findIndex((it) => it.id === id);
        if (idx >= 0) {
            const running = this.activeRequests[idx];
            running.abortController.abort();
            running.abort?.();
            this.activeRequests.splice(idx, 1);
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
