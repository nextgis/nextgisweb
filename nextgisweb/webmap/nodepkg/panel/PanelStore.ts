import { computed, observable } from "mobx";
import type { ReactNode } from "react";

import type { Display } from "../display";

import type { PanelPluginWidgetProps, WidgetPanelPlugin } from "./registry";

export type PanelWidgetProps<S extends PanelStore = PanelStore> =
  PanelPluginWidgetProps<S>;

export interface PanelStoreConstructorOptions {
  plugin: WidgetPanelPlugin;
  display: Display;
}

export class PanelStore {
  readonly name: string;

  public readonly plugin: WidgetPanelPlugin;
  public readonly display: Display;

  @observable.ref accessor title: string;
  @observable.ref accessor order: number;
  @observable.ref accessor desktopOnly = false;

  private loadPromise?: Promise<React.FC<PanelWidgetProps<PanelStore>>>;

  constructor({ plugin, display }: PanelStoreConstructorOptions) {
    this.plugin = plugin;
    this.display = display;

    this.name = plugin.name;
    this.title = plugin.title;
    if (plugin.desktopOnly !== undefined) {
      this.desktopOnly = plugin.desktopOnly;
    }
    this.order = plugin.order ?? Number.MAX_SAFE_INTEGER;
  }

  get icon(): ReactNode {
    return this.plugin.icon;
  }

  get applyToTinyMap(): boolean {
    return this.plugin.applyToTinyMap ?? false;
  }

  @computed
  get visible() {
    return this.display.panelManager.activePanelName === this.name;
  }

  async load(): Promise<React.FC<PanelWidgetProps<PanelStore>>> {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const component = (await this.plugin.widget()).default;
        await this.plugin.startup?.(this.display);
        return component;
      })();
    }
    return this.loadPromise;
  }

  close = () => {
    this.display.panelManager.closePanel();
  };
}
