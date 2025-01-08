type EventCallback = (...args: any[]) => void;

export class EventEmitter {
    private events: Map<string, EventCallback[]> = new Map();

    on(event: string, listener: EventCallback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return {
            remove: () => this.off(event, listener),
        };
    }

    off(event: string, listener: EventCallback) {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event)!;
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event: string, ...args: any[]) {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event)!;
        listeners.forEach((listener) => listener(...args));
    }
}
