import { action, computed, observable } from "mobx";

import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import { normalizeExtent } from "../utils/normalizeExtent";

export class ConfigStore implements DisplayConfig {
  @observable.ref accessor webmapId: DisplayConfig["webmapId"];
  @observable.ref accessor webmapTitle: DisplayConfig["webmapTitle"];
  @observable.ref accessor webmapPlugin: DisplayConfig["webmapPlugin"];
  @observable.ref accessor initialExtent: DisplayConfig["initialExtent"];
  @observable.ref
  accessor constrainingExtent: DisplayConfig["constrainingExtent"];
  @observable.ref accessor rootItem: DisplayConfig["rootItem"];
  @observable.ref accessor checkedItems: DisplayConfig["checkedItems"];
  @observable.ref accessor expandedItems: DisplayConfig["expandedItems"];
  @observable.ref accessor mid: DisplayConfig["mid"];
  @observable.ref accessor annotations: DisplayConfig["annotations"];
  @observable.ref
  accessor webmapDescription: DisplayConfig["webmapDescription"];
  @observable.ref accessor webmapEditable: DisplayConfig["webmapEditable"];
  @observable.ref
  accessor webmapLegendVisible: DisplayConfig["webmapLegendVisible"];
  @observable.ref accessor drawOrderEnabled: DisplayConfig["drawOrderEnabled"];
  @observable.ref accessor measureSrsId: DisplayConfig["measureSrsId"];
  @observable.ref accessor printMaxSize: DisplayConfig["printMaxSize"];
  @observable.ref accessor bookmarkLayerId: DisplayConfig["bookmarkLayerId"];
  @observable.ref accessor options: DisplayConfig["options"];

  constructor(config: DisplayConfig) {
    const preparedConfig = this._prepareConfig(config);

    this.webmapId = preparedConfig.webmapId;
    this.webmapTitle = preparedConfig.webmapTitle;
    this.webmapPlugin = preparedConfig.webmapPlugin;
    this.initialExtent = preparedConfig.initialExtent;
    this.constrainingExtent = preparedConfig.constrainingExtent;
    this.rootItem = preparedConfig.rootItem;
    this.checkedItems = preparedConfig.checkedItems;
    this.expandedItems = preparedConfig.expandedItems;
    this.mid = preparedConfig.mid;
    this.annotations = preparedConfig.annotations;
    this.webmapDescription = preparedConfig.webmapDescription;
    this.webmapEditable = preparedConfig.webmapEditable;
    this.webmapLegendVisible = preparedConfig.webmapLegendVisible;
    this.drawOrderEnabled = preparedConfig.drawOrderEnabled;
    this.measureSrsId = preparedConfig.measureSrsId;
    this.printMaxSize = preparedConfig.printMaxSize;
    this.bookmarkLayerId = preparedConfig.bookmarkLayerId;
    this.options = preparedConfig.options;
  }

  @action.bound
  update(config: DisplayConfig) {
    const preparedConfig = this._prepareConfig(config);

    this.webmapId = preparedConfig.webmapId;
    this.webmapTitle = preparedConfig.webmapTitle;
    this.webmapPlugin = preparedConfig.webmapPlugin;
    this.initialExtent = preparedConfig.initialExtent;
    this.constrainingExtent = preparedConfig.constrainingExtent;
    this.rootItem = preparedConfig.rootItem;
    this.checkedItems = preparedConfig.checkedItems;
    this.expandedItems = preparedConfig.expandedItems;
    this.mid = preparedConfig.mid;
    this.annotations = preparedConfig.annotations;
    this.webmapDescription = preparedConfig.webmapDescription;
    this.webmapEditable = preparedConfig.webmapEditable;
    this.webmapLegendVisible = preparedConfig.webmapLegendVisible;
    this.drawOrderEnabled = preparedConfig.drawOrderEnabled;
    this.measureSrsId = preparedConfig.measureSrsId;
    this.printMaxSize = preparedConfig.printMaxSize;
    this.bookmarkLayerId = preparedConfig.bookmarkLayerId;
    this.options = preparedConfig.options;
  }

  @computed
  get hmux() {
    return !!(pyramidSettings.lunkwill?.hmux && this.options["webmap.hmux"]);
  }

  @computed.struct
  get webmapPluginKeys() {
    return Object.keys(this.webmapPlugin ?? {});
  }

  @action.bound
  setRootItem(rootItem: DisplayConfig["rootItem"]) {
    this.rootItem = rootItem;
  }

  dump(): DisplayConfig {
    return {
      webmapId: this.webmapId,
      webmapTitle: this.webmapTitle,
      webmapPlugin: this.webmapPlugin,
      initialExtent: this.initialExtent,
      constrainingExtent: this.constrainingExtent,
      rootItem: this.rootItem,
      checkedItems: this.checkedItems,
      expandedItems: this.expandedItems,
      mid: this.mid,
      annotations: this.annotations,
      webmapDescription: this.webmapDescription,
      webmapEditable: this.webmapEditable,
      webmapLegendVisible: this.webmapLegendVisible,
      drawOrderEnabled: this.drawOrderEnabled,
      measureSrsId: this.measureSrsId,
      printMaxSize: this.printMaxSize,
      bookmarkLayerId: this.bookmarkLayerId,
      options: this.options,
    };
  }

  private _prepareConfig(config: DisplayConfig): DisplayConfig {
    return {
      ...config,
      initialExtent: normalizeExtent(config.initialExtent),
      constrainingExtent: config.constrainingExtent
        ? normalizeExtent(config.constrainingExtent)
        : config.constrainingExtent,
    };
  }
}
