import { makeAutoObservable } from "mobx";

import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!pyramid";

import { url } from "../nextgis";

const NOTIFICATION_ORDER = ["success", "danger"];

class LayoutStore {
    menuNotification = null;
    menuItems = [];

    constructor() {
        makeAutoObservable(this);
        this._counter = 0;
    }

    addMenuItem(item) {
        const { notification, ...rest } = item;
        if (notification) {
            rest.className = rest.className || `notification-${notification}`;
            if (
                NOTIFICATION_ORDER.indexOf(notification) >
                NOTIFICATION_ORDER.indexOf(this.menuNotification)
            ) {
                this.menuNotification = notification;
            }
        }
        this.menuItems.push({ key: ++this._counter, ...rest });
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
