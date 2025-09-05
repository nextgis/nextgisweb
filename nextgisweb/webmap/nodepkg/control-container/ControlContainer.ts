import type { MapStore } from "../ol/MapStore";
import "./ControlContainer.less";

export interface MapControl {
    id?: string;

    onAdd(map?: MapStore): HTMLElement | undefined;
    onRemove(map?: MapStore): unknown;
    getContainer?(): HTMLElement;
    remove?(): void;
}

type PositionsContainers = {
    [key in ControlPosition]: HTMLElement;
};
export interface CreateControlOptions {
    bar?: boolean;
    style?: React.CSSProperties;
    margin?: boolean;
    className?: string;
}

export type ControlPosition =
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left";

export type TargetPosition = ControlPosition | { inside: string };

export interface ControlContainerOptions {
    target?: string;
    mapStore?: MapStore;
    classPrefix?: string;
}

type PendingItem = { element: HTMLElement; order: number };

export class ControlContainer {
    private readonly classPrefix: string = "mapadapter";
    private readonly mapStore?: MapStore;
    private readonly _container: HTMLElement;
    private readonly _positionsContainers: PositionsContainers;

    private readonly _idContainers: Map<string, HTMLElement> = new Map();
    private readonly _pendingChildren: Map<string, PendingItem[]> = new Map();

    constructor(opt: ControlContainerOptions = {}) {
        this.classPrefix = opt.classPrefix || this.classPrefix;
        this.mapStore = opt.mapStore;
        const { element, positionsContainers } = this._preparePositions();
        this._container = element;
        this._positionsContainers = positionsContainers;
    }

    addTo(el: HTMLElement | string): this {
        const el_ = this.getElement(el);
        if (!el_) {
            console.warn("ControlContainer target element not found:", el);
            return this;
        }
        el_.appendChild(this._container);
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

    getPositionContainer(position: ControlPosition): HTMLElement {
        return this._positionsContainers[position];
    }

    changePlacement(
        wrapperEl: HTMLElement,
        position: TargetPosition,
        order: number = 0
    ): void {
        const nextContainer = this._resolveTargetContainer(position);
        if (nextContainer) {
            this._insertSorted(nextContainer, wrapperEl, order);
        } else if (typeof position !== "string") {
            this._appendPending(position.inside, wrapperEl, order);
        }
    }

    registerIDContainer(id: string, controlRoot: HTMLElement) {
        this._idContainers.set(id, controlRoot);

        this._flushPending(id, controlRoot);
    }

    unregisterIDContainer(id: string): void {
        const container = this._idContainers.get(id);
        if (!container) return;

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        this._idContainers.delete(id);

        if (container.parentElement) {
            container.parentElement.removeChild(container);
        }
    }

    append(
        element: HTMLElement | string,
        position: TargetPosition,
        order: number = 0
    ): void {
        const targetContainer = this._resolveTargetContainer(position);

        const node =
            typeof element === "string"
                ? (() => {
                      const tpl = document.createElement("template");
                      tpl.innerHTML = element.trim();
                      return tpl.content
                          .firstElementChild as HTMLElement | null;
                  })()
                : element;

        if (!node) return;

        if (targetContainer) {
            this._insertSorted(targetContainer, node, order);
        } else if (typeof position !== "string") {
            this._appendPending(position.inside, node, order);
        }
    }

    private _insertSorted(
        positionContainer: HTMLElement,
        el: HTMLElement,
        order: number
    ) {
        el.dataset.order = String(order);
        el.style.order = String(order);
        const children = Array.from(
            positionContainer.children
        ) as HTMLElement[];
        const beforeEl = children.find((c) => {
            const v = Number(c.dataset.order ?? Number.POSITIVE_INFINITY);
            return v > order;
        });

        if (beforeEl) {
            positionContainer.insertBefore(el, beforeEl);
        } else {
            positionContainer.appendChild(el);
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

    private _preparePositions(): {
        element: HTMLElement;
        positionsContainers: {
            [key in ControlPosition]: HTMLElement;
        };
    } {
        const element = document.createElement("div");
        element.className = `${this.classPrefix}-control-container`;

        const positions: ControlPosition[] = [
            "top-right",
            "top-left",
            "bottom-right",
            "bottom-left",
        ];
        const positionsContainers = {} as {
            [key in ControlPosition]: HTMLElement;
        };
        positions.forEach((x) => {
            const positionContainer = this._createPositionContainer(x);
            positionsContainers[x] = positionContainer;
            element.appendChild(positionContainer);
        });

        return { element, positionsContainers };
    }

    private _createPositionContainer(position: ControlPosition): HTMLElement {
        const positionContainer = document.createElement("div");
        positionContainer.className = `${this.classPrefix}-ctrl-${position}`;
        return positionContainer;
    }

    private _resolveTargetContainer(
        position: TargetPosition
    ): HTMLElement | undefined {
        if (typeof position === "string") {
            return this._positionsContainers[position];
        } else {
            return this._idContainers.get(position.inside);
        }
    }

    private _appendPending(
        parentName: string,
        element: HTMLElement,
        order: number
    ) {
        const list = this._pendingChildren.get(parentName) ?? [];
        list.push({ element, order });
        list.sort((a, b) => a.order - b.order);
        this._pendingChildren.set(parentName, list);
    }

    private _flushPending(parentName: string, targetContainer: HTMLElement) {
        const list = this._pendingChildren.get(parentName);
        if (!list || !list.length) return;

        for (const { element, order } of list) {
            this._insertSorted(targetContainer, element, order);
        }
        this._pendingChildren.delete(parentName);
    }
}
