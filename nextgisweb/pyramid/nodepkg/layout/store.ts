import { actionBound, computed, observableRef, observableShallow } from "mobx";
import type { ReactNode } from "react";

import { ModalStore } from "@nextgisweb/gui/show-modal/ModalStore";
import { routeURL } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { url } from "../nextgis";

import type { ModalAPI } from "./type";

const NOTIFICATION_ORDER = ["success", "danger"];

export interface MenuItem {
  className?: string;
  href?: string;
  title?: ReactNode;
  notification?: string;
}

export interface ModalItem {
  id: string;
  element: ReactNode;
}

class LayoutStore {
  readonly modalStore: ModalStore = new ModalStore();

  @observableShallow accessor menuItems: MenuItem[] = [];
  @observableRef accessor hideMenu = false;

  @observableShallow accessor modal: ModalAPI | null = null;

  @actionBound
  setModalApi(modal: ModalAPI | null) {
    this.modal = modal;
  }

  @actionBound
  addMenuItem(item: MenuItem) {
    this.menuItems.push(item);
  }

  @actionBound
  setHideMenu(val: boolean) {
    this.hideMenu = val;
  }

  @computed
  get notification(): string | null {
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

if (
  (!ngwConfig.isAdministrator || ngwConfig.isGuest) &&
  settings.contactAdministratorUrl
) {
  layoutStore.addMenuItem({
    href: settings.contactAdministratorUrl,
    title: gettext("Contact Web GIS administrator"),
  });
}

if (!ngwConfig.isGuest) {
  layoutStore.addMenuItem({
    href: routeURL("pyramid.swagger"),
    title: gettext("OpenAPI documentation"),
  });
}
