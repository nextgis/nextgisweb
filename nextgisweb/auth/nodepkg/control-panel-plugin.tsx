/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import {
  registerControlPanelGroup,
  registerControlPanelItem,
} from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

declare module "@nextgisweb/pyramid/control-panel/registry" {
  interface ControlPanelGroupIdMap {
    auth: true;
  }
}

const hasPermission =
  ngwConfig.isAdministrator ||
  ngwConfig.extraPermissions.some((p) => p.includes("auth"));

registerControlPanelGroup({
  key: "auth",
  order: 10,
  label: gettext("Groups and users"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "group",
  label: gettext("Groups"),
  menu: { order: 10, group: "auth" },
  condition: () => hasPermission,
  href: routeURL("auth.group.browse"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "user",
  label: gettext("Users"),
  menu: { order: 20, group: "auth" },
  condition: () => hasPermission,
  href: routeURL("auth.user.browse"),
});
