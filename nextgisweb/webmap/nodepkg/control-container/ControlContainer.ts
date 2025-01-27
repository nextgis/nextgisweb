import type { MapStore } from "../ol/MapStore";
import "./ControlContainer.css";

export interface MapControl {
    onAdd(map?: MapStore): HTMLElement | undefined;
    onRemove(map?: MapStore): unknown;
    getContainer?(): HTMLElement;
    remove?(): void;
}

export interface CreateControlOptions {
    bar?: boolean;
    margin?: boolean;
    addClass?: string;
}

export type ControlPosition =
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left";

export interface ControlContainerOptions {
    target?: string;
    classPrefix?: string;
    addClass?: string;
    mapAdapter?: MapStore;
}

export class ControlContainer {
    private readonly classPrefix: string = "mapadapter";
    private readonly addClass?: string;
    private readonly mapAdapter?: MapStore;
    private _container: HTMLElement;
    private _positionsContainers: {
        [key in ControlPosition]: HTMLElement | null;
    } = {
        "bottom-left": null,
        "bottom-right": null,
        "top-left": null,
        "top-right": null,
    };

    constructor(opt: ControlContainerOptions = {}) {
        this.classPrefix = opt.classPrefix || this.classPrefix;
        this.addClass = opt.addClass;
        this.mapAdapter = opt.mapAdapter;
        this._container = this.createContainerElement();
    }

    addTo(el: HTMLElement | string): this {
        const el_ = this.getElement(el);
        if (el_) {
            el_.appendChild(this._container);
        }
        return this;
    }

    detach(): void {
        const parent = this._container.parentElement;
        if (parent) {
            parent.removeChild(this._container);
        }
    }

    getContainer(): HTMLElement {
        return this._container;
    }

    getPositionContainer(position: ControlPosition): HTMLElement | undefined {
        const positionContainer = this._positionsContainers[position];
        if (positionContainer) {
            return positionContainer;
        }
    }

    newPositionContainer(position: ControlPosition): HTMLElement | undefined {
        const positionContainer = this.getPositionContainer(position);
        if (positionContainer) {
            const newContainer = document.createElement("div");
            newContainer.className = "openlayers-ctrl";
            // reserve place for async loaded containers
            if (
                position.indexOf("bottom") !== -1 &&
                positionContainer.childElementCount
            ) {
                positionContainer.insertBefore(
                    newContainer,
                    positionContainer.firstChild
                );
            } else {
                positionContainer.appendChild(newContainer);
            }
            return newContainer;
        }
    }

    addControl(control: MapControl, position: ControlPosition): void {
        const controlContainer = control.onAdd(this.mapAdapter);
        if (controlContainer instanceof HTMLElement) {
            this.append(controlContainer, position);
        }
    }

    append(element: HTMLElement | string, position: ControlPosition): void {
        const positionContainer = this._positionsContainers[position];
        if (positionContainer) {
            if (typeof element === "string") {
                const el = document.createElement("div");
                el.outerHTML = element;
                element = el;
            }
            positionContainer.appendChild(element);
        }
    }

    private getElement(el: HTMLElement | string): HTMLElement | undefined {
        if (typeof el === "string") {
            let el_ = document.getElementById(el);
            if (!el_) {
                try {
                    el_ = document.querySelector(el);
                } catch {
                    return undefined;
                }
            }
            return el_ || undefined;
        }
        return el;
    }

    private createContainerElement(): HTMLElement {
        const element = document.createElement("div");
        element.className =
            `${this.classPrefix}-control-container` +
            (this.addClass ? " " + this.addClass : "");

        const positions: ControlPosition[] = [
            "top-right",
            "top-left",
            "bottom-right",
            "bottom-left",
        ];
        positions.forEach((x) => {
            const positionContainer = this._createPositionContainer(x);
            this._positionsContainers[x] = positionContainer;
            element.appendChild(positionContainer);
        });

        return element;
    }

    private _createPositionContainer(position: ControlPosition): HTMLElement {
        const positionContainer = document.createElement("div");
        positionContainer.className = `${this.classPrefix}-ctrl-${position}`;
        return positionContainer;
    }
}
