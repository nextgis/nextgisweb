/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { registerControlPanelItem } from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

const isAdministrator = ngwConfig.isAdministrator;

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "resource_export",
  label: gettext("Resource export"),
  menu: { order: 100, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("resource.control_panel.resource_export"),
});
