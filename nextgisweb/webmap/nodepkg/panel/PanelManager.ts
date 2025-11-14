import { action, computed, observable, runInAction } from "mobx";

import type { Display } from "../display";
import { PanelStore } from "../panel/PanelStore";

import { registry } from "./registry";
import type { PanelPlugin } from "./registry";

type Source = "init" | "menu" | "manager";

interface NavigationPanelInfo {
    active?: string;
    source: Source;
}

export class PanelManager {
    private _display: Display;

    private _onChangePanel?: (panel?: PanelStore) => void;

    @observable.ref accessor allowPanels: string[] | null;

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
        this._display = display;
        if (activePanelKey) {
            this.active = { active: activePanelKey, source: "init" };
        }
        this.allowPanels = allowPanels ?? null;
        this._onChangePanel = onChangePanel;
    }

    @computed
    get visiblePanels() {
        return [...this.sorted].filter((panel) =>
            this._display.isMobile ? !panel.desktopOnly : true
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
        pluginDef: PanelPlugin<PanelStore> | string
    ): Promise<PanelStore | undefined> {
        let plugin: PanelPlugin<PanelStore> | undefined = undefined;
        if (typeof pluginDef === "string") {
            plugin = registry.queryOne(({ name }) => name === pluginDef);
        } else {
            plugin = pluginDef;
        }
        if (plugin) {
            const Cls = plugin.store
                ? (await plugin.store()).default
                : PanelStore;
            const panel = new Cls({ plugin, display: this._display });
            const panels = new Map(this.panels);
            panels.set(plugin.name, panel);
            runInAction(() => {
                this.panels = panels;
            });
            // this._handleInitActive();
            return panel;
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

    activatePanel(name: string): void {
        this.setActive(name, "manager");
    }

    deactivatePanel(): void {
        this.closePanel();
    }

    @computed
    get sorted(): PanelStore[] {
        return Array.from(this.panels.values()).sort(
            (a, b) => a.order - b.order
        );
    }
}
