import { orderBy } from "lodash-es";
import { action, computed, observable } from "mobx";

import type { Display } from "../display";

import { registry } from "./registry";
import type { PanelPlugin } from "./registry";

type Source = "init" | "menu" | "manager";

export interface NavigationPanelInfo {
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

export class PanelsManager {
    private _display: Display;
    private _allowPanels?: string[];

    /** @deprecated use observable {@link PanelsManager.ready} instead */
    private _panelsReady = new Deferred<void>();
    private _onChangePanel: (panel?: PanelPlugin) => void;

    @observable accessor ready = false;
    @observable.shallow accessor panels = new Map<
        string,
        PanelPlugin<unknown>
    >();
    @observable.shallow accessor active: NavigationPanelInfo = {
        active: undefined,
        source: "init",
    };

    constructor(
        display: Display,
        activePanelKey: string | undefined,
        allowPanels: string[] | undefined,
        onChangePanel: (panel?: PanelPlugin) => void
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

        for (const p of plugins) {
            this._makePanel(p as PanelPlugin<unknown>);
        }

        this._handlePanelActivation();
    }

    /** @deprecated use observable {@link PanelsManager.ready} instead */
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
    get activePanel(): PanelPlugin | undefined {
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

    private _makePanel(panel: PanelPlugin<unknown>): void {
        const existingPanels = Array.from(this.panels.values());
        let newPanels = [...existingPanels, panel];
        newPanels = orderBy(newPanels, "order", "asc");
        this.panels = new Map(newPanels.map((p) => [p.name, p]));

        this._handleInitActive();
    }

    getActivePanelName(): string | undefined {
        return this.activePanelName;
    }

    getPanel(name: string): PanelPlugin | undefined {
        return this.panels.get(name);
    }

    getPanelsNames(): string[] {
        return [...this.panels.keys()];
    }

    getPanels(): PanelPlugin[] {
        return [...this.panels.values()];
    }

    getPanelsCount(): number {
        return this.panels.size;
    }

    activatePanel(name: string): void {
        this.setActive(name, "manager");
    }

    deactivatePanel(): void {
        this.closePanel();
    }
}
