import { action, observable } from "mobx";

import type { Display } from "@nextgisweb/webmap/display";
import { PanelStore } from "@nextgisweb/webmap/panels-manager";
import type { PanelPlugin } from "@nextgisweb/webmap/panels-manager/registry";

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
