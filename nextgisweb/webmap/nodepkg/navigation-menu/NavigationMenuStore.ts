import { makeAutoObservable } from "mobx";

type Source = "init" | "menu" | "manager";

export interface NavigationPanelInfo {
    active?: string;
    source: Source;
}

class NavigationMenuStore {
    active: NavigationPanelInfo = {
        active: undefined,
        source: "init",
    };

    constructor() {
        makeAutoObservable(this);
    }

    setActive(active: string | undefined, source: Source): void {
        this.active = { active, source };
    }

    get activePanel(): string | undefined {
        return this.active.active;
    }
}

export const navigationMenuStore = new NavigationMenuStore();
