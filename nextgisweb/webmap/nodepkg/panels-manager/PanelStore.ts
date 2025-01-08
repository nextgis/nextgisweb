import { observable } from "mobx";
import type { ComponentType, ReactNode } from "react";

import type { Display } from "../display";

import type { PanelPlugin } from "./registry";
import type { PanelComponentProps } from "./type";

export class PanelStore {
    readonly name: string;
    readonly plugin: PanelPlugin;
    readonly display: Display;

    @observable.ref accessor title: string;
    @observable.ref accessor order: number;
    @observable.ref accessor enabled: boolean = true;

    private loadPromise?: Promise<ComponentType<PanelComponentProps>> =
        undefined;

    constructor(plugin: PanelPlugin, display: Display) {
        this.plugin = plugin;
        this.display = display;

        this.name = plugin.name;
        this.title = plugin.title;
        this.order = plugin.order ?? Number.MAX_SAFE_INTEGER;
    }

    get menuIcon(): ReactNode {
        return this.plugin.menuIcon;
    }

    get applyToTinyMap(): boolean {
        return this.applyToTinyMap;
    }

    async load(): Promise<ComponentType<PanelComponentProps>> {
        if (!this.loadPromise) {
            this.loadPromise = (async () => {
                let component = await this.plugin.load();
                const startup = this.plugin.startup;
                if (startup) {
                    const propsStartup = (await startup(this.display)) ?? {};
                    const base = component;
                    // @ts-expect-error Non-functional component?
                    component = (props) => base({ ...propsStartup, ...props });
                }
                return component;
            })();
        }
        return this.loadPromise;
    }

    close = () => {
        this.display.panelsManager.closePanel();
    };
}
