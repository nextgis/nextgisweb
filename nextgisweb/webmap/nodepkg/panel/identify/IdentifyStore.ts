import { action, observable } from "mobx";

import { PanelStore } from "@nextgisweb/webmap/panel";

import type { IdentifyInfo } from "./identification";

class IdentifyStore extends PanelStore {
    @observable accessor identifyInfo: IdentifyInfo | undefined = undefined;

    @action
    setIdentifyInfo(value: IdentifyInfo | undefined) {
        this.identifyInfo = value;
    }
}

export default IdentifyStore;
