import type { CSSProperties } from "react";

import { ControlContainer } from "../../control-container/ControlContainer";
import type { TargetPosition } from "../../control-container/ControlContainer";

import "./PanelControl.less";

export interface ControlOptions {
  id?: string;
  order?: number;
  element: HTMLElement;
  position: TargetPosition;
  targetStyle?: CSSProperties;
}

export class PanelControl {
  private panelContainer: ControlContainer;
  private targets = new WeakMap<HTMLElement, HTMLElement>();
  private ids = new WeakMap<HTMLElement, string>();

  constructor() {
    this.panelContainer = new ControlContainer();
  }

  addControl({
    id,
    order = 0,
    element,
    position,
    targetStyle,
  }: ControlOptions): void {
    const target = document.createElement("div");

    if (targetStyle) {
      Object.assign(target.style, targetStyle);
    }
    target.append(element);

    if (id) {
      this.panelContainer.registerIDContainer(id, element);
      this.ids.set(element, id);
    }
    this.panelContainer.append(target, position, order);
    this.targets.set(element, target);
  }

  updateControlPlacement(
    element: HTMLElement,
    position: TargetPosition,
    order: number = 0
  ): void {
    const wrapperEl = this.targets.get(element);
    if (!wrapperEl) return;

    this.panelContainer.changePlacement(wrapperEl, position, order);
  }

  getTarget(element: HTMLElement): HTMLElement | undefined {
    return this.targets.get(element);
  }

  removeControl(element: HTMLElement): void {
    const id = this.ids.get(element);
    if (id) {
      this.panelContainer.unregisterIDContainer(id);
      this.ids.delete(element);
    }

    const target = this.targets.get(element);
    if (target) {
      this.panelContainer.remove(target);
      this.targets.delete(element);
    }
  }

  getContainer(): HTMLElement {
    return this.panelContainer.getContainer();
  }
}
