import { action, observable } from "mobx";

import { PanelStore } from "@nextgisweb/webmap/panels-manager";

import type { IdentifyInfo } from "./identification";

export class IdentifyStore extends PanelStore {
    @observable accessor identifyInfo: IdentifyInfo | undefined = undefined;

    @action
    setIdentifyInfo(value: IdentifyInfo | undefined) {
        this.identifyInfo = value;
    }
}
