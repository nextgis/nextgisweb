import { EventEmitter } from "./EventEmitter";

type EventCallback = (...args: any[]) => void;

export type SubscribeReturnType = { remove: () => void };

class Topic {
    private hub: EventEmitter = new EventEmitter();

    publish<T>(topic: string, event?: T): void {
        this.hub.emit(topic, event);
    }

    subscribe(topic: string, listener: EventCallback): SubscribeReturnType {
        return this.hub.on(topic, listener);
    }
}

export default new Topic();
