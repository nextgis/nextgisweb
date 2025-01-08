import { observable } from "mobx";
import type { ReactNode } from "react";

import type { Display } from "../display";

import type { PanelPlugin, PanelWidget } from "./registry";

export class PanelStore {
    readonly name: string;
    readonly plugin: PanelPlugin;
    readonly display: Display;

    @observable.ref accessor title: string;
    @observable.ref accessor order: number;

    private loadPromise?: Promise<PanelWidget<PanelStore>> = undefined;

    constructor(plugin: PanelPlugin, display: Display) {
        this.plugin = plugin;
        this.display = display;

        this.name = plugin.name;
        this.title = plugin.title;
        this.order = plugin.order ?? Number.MAX_SAFE_INTEGER;
    }

    get icon(): ReactNode {
        return this.plugin.icon;
    }

    get applyToTinyMap(): boolean {
        return this.applyToTinyMap;
    }

    async load(): Promise<PanelWidget<PanelStore>> {
        if (!this.loadPromise) {
            this.loadPromise = (async () => {
                const component = await this.plugin.load();
                await this.plugin.startup?.(this.display);
                return component;
            })();
        }
        return this.loadPromise;
    }

    close = () => {
        this.display.panelsManager.closePanel();
    };
}
