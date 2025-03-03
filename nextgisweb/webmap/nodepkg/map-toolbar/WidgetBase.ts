export abstract class WidgetBase {
    domNode: HTMLElement;
    isStarted: boolean;

    constructor() {
        this.domNode = document.createElement("div");
        this.isStarted = false;
    }

    postCreate(): void {}

    startup(): void {
        if (!this.isStarted) {
            this.postCreate();
            this.isStarted = true;
        }
    }

    placeAt(container: HTMLElement | string): void {
        const target =
            typeof container === "string"
                ? document.querySelector(container)
                : container;
        if (target) {
            target.appendChild(this.domNode);
        } else {
            console.warn("Target container not found");
        }
    }

    destroy(): void {
        if (this.domNode.parentNode) {
            this.domNode.parentNode.removeChild(this.domNode);
        }
    }

    set(property: string, value: any): void {
        (this as any)[property] = value;
    }

    get(property: string): any {
        return (this as any)[property];
    }
}
