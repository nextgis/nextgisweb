/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { registerControlPanelItem } from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import settings from "./client-settings";

const isAdministrator = ngwConfig.isAdministrator;

const hasCorsPermission =
  isAdministrator || ngwConfig.extraPermissions.some((p) => p.includes("cors"));

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "storage",
  label: gettext("Storage"),
  menu: { order: 10, group: "info" },
  condition: () => isAdministrator && settings.storage.enabled,
  href: routeURL("pyramid.control_panel.storage"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "sysinfo",
  label: gettext("System information"),
  menu: { order: 20, group: "info" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.sysinfo"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "cors",
  label: gettext("Cross-origin resource sharing (CORS)"),
  menu: { order: 40, group: "settings" },
  condition: () => hasCorsPermission,
  href: routeURL("pyramid.control_panel.cors"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "fonts",
  label: gettext("Font management"),
  menu: { order: 60, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.fonts"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "system_name",
  label: gettext("Web GIS name"),
  menu: { order: 30, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.system_name"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "custom_css",
  label: gettext("Custom CSS"),
  menu: { order: 50, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.custom_css"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "logo",
  label: gettext("Custom logo"),
  menu: { order: 80, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.logo"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "home_path",
  label: gettext("Home path"),
  menu: { order: 70, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.home_path"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "metrics",
  label: gettext("Metrics and analytics"),
  menu: { order: 90, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("pyramid.control_panel.metrics"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "backups",
  label: gettext("Backups"),
  menu: { order: 30, group: "info" },
  condition: () => isAdministrator && settings.backup.download,
  href: routeURL("pyramid.control_panel.backup.browse"),
});
