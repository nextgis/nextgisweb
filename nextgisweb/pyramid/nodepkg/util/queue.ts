type RequestFunc = (opt: { signal: AbortSignal }) => Promise<unknown>;
type Abort = () => void;

type AbortableRequest = {
  id: string | number;
  request: RequestFunc;
  abort?: Abort;
  abortController: AbortController;
  timeout?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
  completed?: boolean;
};

interface RequestQueueOptions {
  /** Concurrent requests count */
  limit?: number;
  /** Abort active request after this time in ms */
  timeout?: number;
  /** Time in ms */
  debounce?: number;
}

interface RequestQueueAddOptions {
  abort?: Abort;
  id?: string | number;
  timeout?: number;
}

export class RequestQueue {
  private queue: AbortableRequest[] = [];
  private activeRequests: AbortableRequest[] = [];
  private limit: number;
  private timeout?: number;
  readonly debounce: number;

  private timeoutId?: ReturnType<typeof setTimeout>;
  private resumeTimer?: ReturnType<typeof setTimeout>;

  private paused = false;
  private idleResolvers: Array<() => void> = [];

  constructor({ limit = 1, timeout, debounce = 0 }: RequestQueueOptions = {}) {
    this.limit = limit;
    this.timeout = timeout;
    this.debounce = debounce;
  }

  setLimit(limit: number) {
    this.limit = limit;
  }

  add(request: RequestFunc, options?: RequestQueueAddOptions) {
    const { abort, id } = options || {};
    if (id !== undefined && id !== null) {
      this.removeById(id);
    }
    const queueItem: AbortableRequest = {
      id: id ?? Math.random().toString(36).slice(2),
      request,
      abort,
      abortController: new AbortController(),
      timeout: options?.timeout ?? this.timeout,
    };
    this.queue.push(queueItem);
    this.debouncedStart();
    return queueItem;
  }

  abort() {
    for (const q of [...this.queue, ...this.activeRequests]) {
      this.abortRequest(q);
      this.clearRequestTimeout(q);
      q.completed = true;
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

  clearQueue() {
    for (const q of this.queue) {
      this.abortRequest(q);
      this.clearRequestTimeout(q);
      q.completed = true;
    }

    this.queue.length = 0;
    this._clearTimeout();
    this.checkIdle();
  }

  private debouncedStart() {
    if (this.paused) return;
    if (this.activeRequests.length > 0) {
      this._next();
      return;
    }
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

    while (this.activeRequests.length < this.limit && this.queue.length > 0) {
      const requestItem = this.queue.shift()!;
      const { request, abortController } = requestItem;

      if (!abortController.signal.aborted) {
        this.activeRequests.push(requestItem);
        this.startRequestTimeout(requestItem);

        request({ signal: abortController.signal }).finally(() => {
          this.finishRequest(requestItem);
        });
      } else {
        this._next();
      }
    }
  }

  private removeById(id: number | string) {
    this.queue = this.queue.filter((item) => item.id !== id);
    const idx = this.activeRequests.findIndex((it) => it.id === id);
    if (idx >= 0) {
      const running = this.activeRequests[idx];
      this.abortRequest(running);
      this.finishRequest(running);
    }
  }

  private startRequestTimeout(requestItem: AbortableRequest) {
    if (!requestItem.timeout || requestItem.timeout <= 0) {
      return;
    }

    requestItem.timeoutId = setTimeout(() => {
      this.abortRequest(
        requestItem,
        new DOMException("Request timed out", "TimeoutError")
      );
      this.finishRequest(requestItem);
    }, requestItem.timeout);
  }

  private abortRequest(requestItem: AbortableRequest, reason?: unknown) {
    if (!requestItem.abortController.signal.aborted) {
      requestItem.abortController.abort(reason);
    }

    requestItem.abort?.();
  }

  private clearRequestTimeout(requestItem: AbortableRequest) {
    if (requestItem.timeoutId) {
      clearTimeout(requestItem.timeoutId);
      requestItem.timeoutId = undefined;
    }
  }

  private finishRequest(requestItem: AbortableRequest) {
    if (requestItem.completed) {
      return;
    }

    requestItem.completed = true;
    this.clearRequestTimeout(requestItem);
    this.activeRequests = this.activeRequests.filter(
      (req) => req !== requestItem
    );
    this.checkIdle();
    this._next();
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
