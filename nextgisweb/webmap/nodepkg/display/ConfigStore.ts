import { actionBound, computed, computedStruct, observableRef } from "mobx";

import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import { normalizeExtent } from "../utils/normalizeExtent";

export class ConfigStore implements DisplayConfig {
  @observableRef accessor webmapId: DisplayConfig["webmapId"];
  @observableRef accessor webmapTitle: DisplayConfig["webmapTitle"];
  @observableRef accessor webmapPlugin: DisplayConfig["webmapPlugin"];
  @observableRef accessor initialExtent: DisplayConfig["initialExtent"];
  @observableRef
  accessor constrainingExtent: DisplayConfig["constrainingExtent"];
  @observableRef accessor rootItem: DisplayConfig["rootItem"];
  @observableRef accessor checkedItems: DisplayConfig["checkedItems"];
  @observableRef accessor expandedItems: DisplayConfig["expandedItems"];
  @observableRef accessor mid: DisplayConfig["mid"];
  @observableRef accessor annotations: DisplayConfig["annotations"];
  @observableRef
  accessor webmapDescription: DisplayConfig["webmapDescription"];
  @observableRef accessor webmapEditable: DisplayConfig["webmapEditable"];
  @observableRef
  accessor webmapLegendVisible: DisplayConfig["webmapLegendVisible"];
  @observableRef accessor drawOrderEnabled: DisplayConfig["drawOrderEnabled"];
  @observableRef accessor measureSrsId: DisplayConfig["measureSrsId"];
  @observableRef accessor printMaxSize: DisplayConfig["printMaxSize"];
  @observableRef accessor bookmarkLayerId: DisplayConfig["bookmarkLayerId"];
  @observableRef accessor options: DisplayConfig["options"];

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

  @actionBound
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

  @computedStruct
  get webmapPluginKeys() {
    return Object.keys(this.webmapPlugin ?? {});
  }

  @computedStruct
  get layerPluginKeys() {
    return (this.mid.plugin ?? []).sort();
  }

  @computedStruct
  get pluginKeys() {
    return [...this.webmapPluginKeys, ...this.layerPluginKeys].sort();
  }

  @actionBound
  setRootItem(rootItem: DisplayConfig["rootItem"]) {
    this.rootItem = rootItem;
  }

  @actionBound
  setWebmapPlugin(webmapPlugin: DisplayConfig["webmapPlugin"]) {
    this.webmapPlugin = webmapPlugin;
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
