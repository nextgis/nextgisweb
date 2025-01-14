import { action, observable } from "mobx";

import { PanelStore } from "..";
import type { PanelStoreConstructorOptions } from "../PanelStore";

export default class DescriptionStore extends PanelStore {
    @observable.ref accessor content: string | null = null;

    constructor({ plugin, display }: PanelStoreConstructorOptions) {
        super({ plugin, display });
        this.content = display.config.webmapDescription;
    }

    @action
    setContent(value: string | null) {
        this.content = value;
    }
}
