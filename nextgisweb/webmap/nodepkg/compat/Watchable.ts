export abstract class Watchable<WatchableProps extends Record<string, any>> {
    private watchHandlers: {
        [K in keyof WatchableProps]?: Array<
            (
                attr: K,
                oldVal: WatchableProps[K],
                newVal: WatchableProps[K]
            ) => void
        >;
    } = {};

    watch<T extends keyof WatchableProps>(
        attr: T,
        callback: (
            attr: T,
            oldVal: WatchableProps[T],
            newVal: WatchableProps[T]
        ) => void
    ): void {
        if (!this.watchHandlers[attr]) {
            this.watchHandlers[attr] = [];
        }
        this.watchHandlers[attr]!.push(callback);
    }

    unwatch<T extends keyof WatchableProps>(
        attr: T,
        callback: (
            attr: T,
            oldVal: WatchableProps[T],
            newVal: WatchableProps[T]
        ) => void
    ): void {
        const handlers = this.watchHandlers[attr];
        if (handlers) {
            const index = handlers.indexOf(callback);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    protected notify<T extends keyof WatchableProps>(
        attr: T,
        oldVal: WatchableProps[T],
        newVal: WatchableProps[T]
    ): void {
        const handlers = this.watchHandlers[attr];
        if (handlers) {
            handlers.forEach((callback) => {
                callback(attr, oldVal, newVal);
            });
        }
    }
}
