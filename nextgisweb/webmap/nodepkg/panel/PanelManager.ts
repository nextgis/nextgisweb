import { action, computed, observable } from "mobx";

import type { Display } from "../display";
import { PanelStore } from "../panel/PanelStore";

import { registry } from "./registry";

type Source = "init" | "menu" | "manager";

interface NavigationPanelInfo {
    active?: string;
    source: Source;
}

class Deferred<T> {
    promise: Promise<T>;
    resolve!: (value: T | PromiseLike<T>) => void;
    reject!: (reason: unknown) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

export class PanelManager {
    private _display: Display;
    private _allowPanels?: string[];

    /** @deprecated use observable {@link PanelManager.ready} instead */
    private _panelsReady = new Deferred<void>();
    private _onChangePanel: (panel?: PanelStore) => void;

    @observable.ref accessor ready = false;
    @observable.shallow accessor panels = new Map<string, PanelStore>();
    @observable.shallow accessor active: NavigationPanelInfo = {
        active: undefined,
        source: "init",
    };

    constructor(
        display: Display,
        activePanelKey: string | undefined,
        allowPanels: string[] | undefined,
        onChangePanel: (panel?: PanelStore) => void
    ) {
        this._display = display;
        if (activePanelKey) {
            this.active = { active: activePanelKey, source: "init" };
        }
        this._allowPanels = allowPanels;
        this._onChangePanel = onChangePanel;

        const plugins = registry.queryAll(({ name, isEnabled }) => {
            return (
                (!allowPanels || allowPanels.includes(name)) &&
                (!isEnabled || isEnabled(display))
            );
        });

        for (const plugin of plugins) {
            const cls = plugin.storeClass ?? PanelStore;
            const panel = new cls(plugin, this._display);
            this.panels.set(plugin.name, panel);
            this._handleInitActive();
        }

        this._handlePanelActivation();
    }

    /** @deprecated use observable {@link PanelManager.ready} instead */
    get panelsReady(): Deferred<void> {
        return this._panelsReady;
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

    @computed
    get activePanel(): PanelStore | undefined {
        if (this.activePanelName) {
            return this.panels.get(this.activePanelName);
        }
    }

    @computed
    get activePanelName(): string | undefined {
        return this.active.active;
    }

    closePanel = (): void => {
        this.setActive(undefined, "manager");
    };

    @action
    private _handleInitActive(): void {
        this.ready = true;
        this._panelsReady.resolve();
    }

    private _handlePanelActivation(): void {
        if (!this.active.active || !this.panels.has(this.active.active)) {
            this._activateFirstPanel();
        }
        this._handleInitActive();
    }

    private _activateFirstPanel(): void {
        const firstPanelKey = this.panels.keys().next().value;
        if (firstPanelKey) {
            this.setActive(firstPanelKey, "init");
        }
    }

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

    sorted(): PanelStore[] {
        const sorted: PanelStore[] = [];
        for (const panel of this.panels.values()) {
            sorted.push(panel);
        }

        sorted.sort((a, b) => a.order - b.order);
        return sorted;
    }
}
