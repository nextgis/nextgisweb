import type { Display } from "../display";
import type { ToolBase } from "../map-controls/tool/ToolBase";
import { MapStatesObserverSingleton } from "../map-state-observer/MapStatesObserver";

import { ToggleControl } from "./ToggleControl";
import { WidgetBase } from "./WidgetBase";

interface ToolbarButton {
    new (options: unknown): {
        display: Display;
        placeAt: (node: HTMLElement) => void;
    };
}

export class MapToolbarItems extends WidgetBase {
    private display: Display;
    private mapStates = MapStatesObserverSingleton.getInstance();

    constructor({ display }: { display: Display }) {
        super();
        this.display = display;
        this.domNode.className = "map-toolbar-items";
    }

    addTool(
        tool: ToolBase,
        state: string,
        place?: HTMLElement | ((control: ToggleControl) => void)
    ): void {
        const cssClasses = ["ol-control", "ol-unselectable"];
        if (tool.customCssClass) {
            cssClasses.push(tool.customCssClass);
        }

        const tglButtonTool = new ToggleControl({
            label: tool.label,
            showLabel: false,
            tool,
            state,
            class: cssClasses.join(" "),
        });

        if (typeof place === "function") {
            place(tglButtonTool);
        } else if (place instanceof HTMLElement) {
            tglButtonTool.placeAt(place);
        } else {
            tglButtonTool.placeAt(this.domNode);
        }

        tool.toolbarBtn = tglButtonTool;
        this.bindChangeEvent(tglButtonTool);

        tglButtonTool.activate = () => {
            this.unbindChangeEvent(tglButtonTool);
            tglButtonTool.setChecked(true);
            this.bindChangeEvent(tglButtonTool);
            if (tglButtonTool.tool?.activate) tglButtonTool.tool.activate();
        };

        tglButtonTool.deactivate = () => {
            this.unbindChangeEvent(tglButtonTool);
            tglButtonTool.setChecked(false);
            this.bindChangeEvent(tglButtonTool);
            if (tglButtonTool.tool?.deactivate) tglButtonTool.tool.deactivate();
        };

        this.mapStates.addState(state, tglButtonTool, false);
    }

    addButton(Button: ToolbarButton, options: unknown): void {
        const button = new Button(options);
        button.display = this.display;
        button.placeAt(this.domNode);
    }

    private bindChangeEvent(tglButtonTool: ToggleControl): void {
        tglButtonTool.onChange(() => {
            this.toolChangeEventHandle(tglButtonTool);
        });
    }

    private unbindChangeEvent(tglButtonTool: ToggleControl): void {
        tglButtonTool.onChange(() => {});
    }

    private toolChangeEventHandle(tglButtonTool: ToggleControl): void {
        const checked = tglButtonTool.isChecked();
        if (checked) {
            this.mapStates.activateState(tglButtonTool.state);
        } else {
            this.mapStates.deactivateState(tglButtonTool.state);
        }
    }
}
