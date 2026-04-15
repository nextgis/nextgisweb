import { action, computed, observable, runInAction } from "mobx";

import type { Display } from "../display";
import { PanelStore } from "../panel/PanelStore";

import { registry } from "./registry";
import type { PanelPlugin, WidgetPanelPlugin } from "./registry";

type Source = "init" | "menu" | "manager";

interface NavigationPanelInfo {
  active?: string;
  source: Source;
}

interface RegisterPluginOptions {
  /** Register plugin even if not enadlet.
   * Needed for layerInfo panel, which depends on the webMapInfo panel.
   * Without it, the content cannot be shown.
   * Better to refactor the Layer Info panel.
   */
  force?: boolean;
}

export class PanelManager {
  readonly display: Display;

  private _onChangePanel?: (panel?: PanelStore) => void;

  @observable.ref accessor allowPanels: string[] | null;

  @observable.shallow accessor plugins: PanelPlugin[] = [];
  @observable.shallow accessor panels = new Map<string, PanelStore>();
  @observable.shallow accessor active: NavigationPanelInfo = {
    active: undefined,
    source: "init",
  };

  constructor({
    display,
    activePanelKey,
    allowPanels,
    onChangePanel,
  }: {
    display: Display;
    activePanelKey?: string | undefined;
    allowPanels?: string[] | undefined;
    onChangePanel?: (panel?: PanelStore) => void;
  }) {
    this.display = display;
    if (activePanelKey) {
      this.active = { active: activePanelKey, source: "init" };
    }
    this.allowPanels = allowPanels ?? null;
    this._onChangePanel = onChangePanel;
  }

  @computed
  get items(): PanelPlugin[] {
    return [...this.plugins]
      .filter((plugin) => (this.display.isMobile ? !plugin.desktopOnly : true))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  @computed
  get visiblePanels() {
    return [...this.sorted].filter((panel) =>
      this.display.isMobile ? !panel.desktopOnly : true
    );
  }

  @computed
  get activePanel(): PanelStore | undefined {
    if (this.activePanelName) {
      return this.visiblePanels.find(
        ({ name }) => name === this.activePanelName
      );
    }
  }

  @computed
  get activePanelName(): string | undefined {
    return this.active.active;
  }

  @action.bound
  setAllowPanels(val: string[] | null) {
    this.allowPanels = val;
  }

  async registerPlugin(
    pluginDef: PanelPlugin | string,
    options?: RegisterPluginOptions
  ): Promise<PanelPlugin | undefined> {
    let plugin: PanelPlugin | undefined = undefined;
    if (typeof pluginDef === "string") {
      plugin = registry.queryOne(({ name }) => name === pluginDef);
    } else {
      plugin = pluginDef;
    }

    const existPlugin = this.plugins.find((p) => p.name === plugin.name);
    if (existPlugin) {
      return existPlugin;
    }

    if (plugin) {
      if (this.allowPanels && !this.allowPanels.includes(plugin.name)) {
        return;
      }
      if (plugin.isEnabled && !options?.force) {
        const isEnabled = await plugin.isEnabled(this.display);
        if (!isEnabled) return;
      }

      if (!this.plugins.some((p) => p.name === plugin.name)) {
        runInAction(() => {
          this.plugins = [...this.plugins, plugin!];
        });
      }

      if (plugin.type !== "widget") {
        return;
      }

      const widgetPlugin = plugin as WidgetPanelPlugin;
      const Cls = widgetPlugin.store
        ? (await widgetPlugin.store()).default
        : PanelStore;

      const panel = new Cls({ plugin: widgetPlugin, display: this.display });
      const panels = new Map(this.panels);
      panels.set(widgetPlugin.name, panel);

      runInAction(() => {
        this.panels = panels;
      });
      return widgetPlugin;
    }
  }

  @action
  setActive(active: string | undefined, source: Source): void {
    const currentActive = this.active.active;
    this.active = { active, source };
    if (currentActive !== active) {
      if (this._onChangePanel) {
        this._onChangePanel(this.activePanel);
      }
    }
  }

  closePanel = (): void => {
    this.setActive(undefined, "manager");
  };

  getActivePanelName(): string | undefined {
    return this.activePanelName;
  }

  getPanel<T extends PanelStore = PanelStore>(name: string): T | undefined {
    return this.panels.get(name) as T;
  }

  getItem(name: string): PanelPlugin | undefined {
    return this.plugins.find((plugin) => plugin.name === name);
  }

  activatePanel(name: string): void {
    this.setActive(name, "manager");
  }

  deactivatePanel(): void {
    this.closePanel();
  }

  @computed
  get sorted(): PanelStore[] {
    return Array.from(this.panels.values()).sort((a, b) => a.order - b.order);
  }
}
