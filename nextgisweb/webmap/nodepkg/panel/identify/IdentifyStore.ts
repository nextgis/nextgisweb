import { action, observableRef } from "mobx";

import { PanelStore } from "@nextgisweb/webmap/panel";

import type { IdentifyInfo } from "./identification";

class IdentifyStore extends PanelStore {
  @observableRef accessor identifyInfo: IdentifyInfo | undefined = undefined;

  @action
  setIdentifyInfo(value: IdentifyInfo | undefined) {
    this.identifyInfo = value;
  }
}

export default IdentifyStore;
