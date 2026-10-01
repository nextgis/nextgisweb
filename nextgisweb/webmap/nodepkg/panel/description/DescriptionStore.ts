import { action, computed, observableRef } from "mobx";

import { PanelStore } from "..";

export default class DescriptionStore extends PanelStore {
  @observableRef accessor contentOverride: string | null | undefined =
    undefined;

  @computed
  get content() {
    return this.contentOverride !== undefined
      ? this.contentOverride
      : this.display.config.webmapDescription;
  }

  @action
  setContent(value: string | null) {
    this.contentOverride = value;
  }
}
