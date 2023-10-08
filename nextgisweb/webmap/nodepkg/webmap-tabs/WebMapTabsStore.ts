import { makeAutoObservable, runInAction } from "mobx";
import type { ComponentType, ReactElement } from "react";

interface WebMapTabsStoreProps {
    onTabs?: () => void;
}

interface Tab {
    key: string;
    label: string;
    children?: ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component?: <T extends ComponentType<any>>() => Promise<{ default: T }>;
    props?: Record<string, unknown>;
}

export class WebMapTabsStore {
    activeKey?: string | null = null;

    _onTabs?: () => void;
    private _tabs: Tab[] = [];

    constructor({ onTabs }: WebMapTabsStoreProps) {
        this._onTabs = onTabs;
        makeAutoObservable(this, { _onTabs: false });
    }

    get tabs() {
        return this._tabs;
    }

    setActiveKey = (activeKey?: string) => {
        if (activeKey) {
            const exist = this._tabs.find((t) => t.key === activeKey);
            if (exist) {
                runInAction(() => {
                    this.activeKey = activeKey;
                });
            }
        }
    };

    setTabs = (tabs: Tab[]) => {
        this._tabs = tabs;
        if (this._onTabs) {
            this._onTabs();
        }
    };

    addTab = (tab: Tab): void => {
        const key = tab.key;
        if (!key) {
            throw new Error("You can not add a tab without the key");
        }
        const exist = this._tabs.find((t) => t.key === key);
        if (!exist) {
            this.setTabs([...this._tabs, tab]);
        }
        this.setActiveKey(key);
    };

    removeTab = (key: string): void => {
        const existIndex = this._tabs.findIndex((t) => t.key === key);
        if (existIndex !== -1) {
            const newTabs = [...this.tabs];
            newTabs.splice(existIndex, 1);
            if (newTabs.length) {
                const nearestTab =
                    newTabs[existIndex] || newTabs[existIndex - 1];
                if (nearestTab) {
                    this.setActiveKey(nearestTab.key);
                }
            }
            this.setTabs(newTabs);
        }
    };
}
