import { action, computed, observable } from "mobx";
import type { ReactNode } from "react";

import { routeURL } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { url } from "../nextgis";

const NOTIFICATION_ORDER = ["success", "danger"];

export interface MenuItem {
    key?: number;
    className?: string;
    href?: string;
    title?: ReactNode;
    notification?: string;
}

class LayoutStore {
    @observable.shallow accessor menuItems: MenuItem[] = [];

    private counter: number = 0;

    @action
    addMenuItem(item: MenuItem) {
        this.menuItems.push({ key: ++this.counter, ...item });
    }

    @computed
    get notification() {
        let current: string | null = null;
        this.menuItems.forEach(({ notification }) => {
            if (!notification) return;
            if (
                !current ||
                NOTIFICATION_ORDER.indexOf(notification) >
                    NOTIFICATION_ORDER.indexOf(current)
            ) {
                current = notification;
            }
        });
        return current;
    }
}

export const layoutStore = new LayoutStore();

layoutStore.addMenuItem({
    href: routeURL("resource.show", 0),
    title: gettext("Resources"),
});

if (ngwConfig.controlPanel) {
    layoutStore.addMenuItem({
        href: routeURL("pyramid.control_panel"),
        title: gettext("Control panel"),
    });
}

if (settings["help_page_url"]) {
    layoutStore.addMenuItem({
        href: url(settings["help_page_url"]),
        title: gettext("Help"),
    });
}
