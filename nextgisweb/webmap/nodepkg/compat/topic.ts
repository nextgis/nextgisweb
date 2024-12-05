import { EventEmitter } from "./EventEmitter";

type EventCallback = (...args: any[]) => void;

class Topic {
    private hub: EventEmitter = new EventEmitter();

    publish(topic: string, event?: any): void {
        this.hub.emit(topic, event);
    }

    subscribe(topic: string, listener: EventCallback): { remove: () => void } {
        return this.hub.on(topic, listener);
    }
}

export default new Topic();
