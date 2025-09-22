import Control from "ol/control/Control";

import { ControlContainer } from "../../control-container/ControlContainer";
import type { TargetPosition } from "../../control-container/ControlContainer";

import "./PanelControl.less";

interface PanelControlOptions {
    collapsible?: boolean;
}

const OPTIONS: PanelControlOptions = {
    collapsible: false,
};

export interface ControlOptions {
    id?: string;
    order?: number;
    control: Control;
    position: TargetPosition;
    targetStyle?: React.CSSProperties;
}

export class PanelControl extends Control {
    private panelContainer: ControlContainer;
    private targets = new WeakMap<Control, HTMLElement>();
    private ids = new WeakMap<Control, string>();

    constructor(options?: PanelControlOptions) {
        const panelContainer = new ControlContainer();
        const element = panelContainer.getContainer();
        super({ ...OPTIONS, ...options, element });
        this.panelContainer = panelContainer;
    }

    addControl({
        id,
        order = 0,
        control,
        position,
        targetStyle,
    }: ControlOptions): void {
        const map = this.getMap();
        if (!map) return;

        const target = document.createElement("div");

        if (targetStyle) {
            Object.assign(target.style, targetStyle);
        }
        // @ts-expect-error Property 'element' is protected in OL types
        const element = control.element as HTMLElement | undefined;

        if (id) {
            this.panelContainer.registerIDContainer(id, element || target);
            this.ids.set(control, id);
        }
        this.panelContainer.append(target, position, order);

        control.setTarget(target);

        map.addControl(control);
        this.targets.set(control, target);
    }

    updateControlPlacement(
        control: Control,
        position: TargetPosition,
        order: number = 0
    ): void {
        //  @ts-expect-error private property
        const target = control.target_ as HTMLElement | string | undefined;
        const wrapperEl = (
            typeof target === "string" ? document.querySelector(target) : target
        ) as HTMLElement | null;

        if (!wrapperEl) return;

        this.panelContainer.changePlacement(wrapperEl, position, order);
    }

    getTarget(control: Control): HTMLElement | undefined {
        return this.targets.get(control);
    }

    removeControl(control: Control): void {
        const map = this.getMap();
        if (map) {
            map.removeControl(control);
        }

        const id = this.ids.get(control);
        if (id) {
            this.panelContainer.unregisterIDContainer(id);
            this.ids.delete(control);
        }

        const target = this.targets.get(control);
        if (target) {
            target.remove();
            this.targets.delete(control);
        }
    }

    getContainer(): HTMLElement {
        return this.panelContainer.getContainer();
    }
}
