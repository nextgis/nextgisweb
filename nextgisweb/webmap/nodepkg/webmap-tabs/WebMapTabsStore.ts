import { action, observable } from "mobx";
import type React from "react";
import type { ComponentType, ReactElement } from "react";

interface WebMapTabsStoreProps {
    onTabs?: () => void;
}

export interface WebMapTab<P = any> {
    key: string;
    label: React.ReactNode;
    children?: ReactElement;
    component?: () => Promise<{ default: ComponentType<P> }>;
    props?: P;
}

export class WebMapTabsStore {
    _onTabs?: () => void;

    @observable.shallow accessor tabs: WebMapTab[] = [];
    @observable.ref accessor activeKey: string | null = null;

    constructor({ onTabs }: WebMapTabsStoreProps = {}) {
        this._onTabs = onTabs;
    }

    @action
    setActiveKey = (activeKey?: string) => {
        if (activeKey) {
            const exist = this.tabs.find((t) => t.key === activeKey);
            if (exist) {
                this.activeKey = activeKey;
            }
        }
    };

    @action
    setTabs = (tabs: WebMapTab[]) => {
        this.tabs = tabs;
        if (this._onTabs) {
            this._onTabs();
        }
    };

    addTab = <P = any>(tab: WebMapTab<P>): void => {
        const key = tab.key;
        if (!key) {
            throw new Error("You can not add a tab without the key");
        }
        const exist = this.tabs.find((t) => t.key === key);
        if (!exist) {
            this.setTabs([...this.tabs, tab]);
        }
        this.setActiveKey(key);
    };

    removeTab = (key: string): void => {
        const existIndex = this.tabs.findIndex((t) => t.key === key);
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
