import { action, observable } from "mobx";

import type { Display } from "@nextgisweb/webmap/display";

import { PanelStore } from "..";
import type { PanelPlugin } from "..";

export class DescriptionStore extends PanelStore {
    @observable.ref accessor content: string | null = null;

    constructor(plugin: PanelPlugin, display: Display) {
        super(plugin, display);
        this.content = display.config.webmapDescription;
    }

    @action
    setContent(value: string | null) {
        this.content = value;
    }
}
