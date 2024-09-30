import "./PanelControl.css";

import Control from "ol/control/Control";

import { ControlContainer } from "../../control-container/ControlContainer";
import type { ControlPosition } from "../../control-container/ControlContainer";

interface PanelControlOptions {
    collapsible?: boolean;
}

const OPTIONS: PanelControlOptions = {
    collapsible: false,
};

export class PanelControl extends Control {
    private panelContainer: ControlContainer;

    constructor(options?: PanelControlOptions) {
        const panelContainer = new ControlContainer();
        const element = panelContainer.getContainer();
        super({ ...OPTIONS, ...options, element });
        this.panelContainer = panelContainer;
    }

    async addControl(
        control: Control,
        position: ControlPosition
    ): Promise<void> {
        const map = this.getMap();
        if (map) {
            const target = this.panelContainer.newPositionContainer(position);
            if (target) {
                const _control = await control;
                // @ts-expect-error Property 'element' is protected
                const element = _control.element;
                if (element) {
                    element.classList.add("mapadapter-ctrl");
                }
                _control.setTarget(target);
                map.addControl(_control);
            }
        }
    }

    removeControl(control: Control): void {
        const map = this.getMap();
        if (map) {
            map.removeControl(control);
        }
    }

    getContainer(): HTMLElement {
        return this.panelContainer.getContainer();
    }
}
