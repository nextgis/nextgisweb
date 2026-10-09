import type { CSSProperties } from "react";

import "./ControlContainer.less";

type PositionsContainers = {
  [key in ControlPosition]: HTMLElement;
};
export interface CreateControlOptions {
  bar?: boolean;
  style?: CSSProperties;
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
  classPrefix?: string;
}

type PendingItem = { element: HTMLElement; order: number };

export class ControlContainer {
  private readonly classPrefix: string = "mapadapter";
  private readonly _container: HTMLElement;
  private readonly _positionsContainers: PositionsContainers;

  private readonly _idContainers: Map<string, HTMLElement> = new Map();
  private readonly _pendingChildren: Map<string, PendingItem[]> = new Map();

  constructor(opt: ControlContainerOptions = {}) {
    this.classPrefix = opt.classPrefix || this.classPrefix;
    const { element, positionsContainers } = this._preparePositions();
    this._container = element;
    this._positionsContainers = positionsContainers;
  }

  getContainer(): HTMLElement {
    return this._container;
  }

  remove(element: HTMLElement): void {
    this._removePending(element);
    element.remove();
  }

  changePlacement(
    wrapperEl: HTMLElement,
    position: TargetPosition,
    order: number = 0
  ): void {
    this._removePending(wrapperEl);
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
    this._idContainers.delete(id);
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
            return tpl.content.firstElementChild as HTMLElement | null;
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
    const children = Array.from(positionContainer.children) as HTMLElement[];
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
    element.style.direction = getComputedStyle(document.body).direction;

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

  private _removePending(element: HTMLElement): void {
    for (const [id, children] of this._pendingChildren) {
      const pending = children.filter((child) => child.element !== element);
      if (pending.length) {
        this._pendingChildren.set(id, pending);
      } else {
        this._pendingChildren.delete(id);
      }
    }
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
