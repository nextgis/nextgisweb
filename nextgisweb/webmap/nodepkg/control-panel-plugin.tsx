/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { registerControlPanelItem } from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "webmap",
  label: gettext("Web map"),
  menu: { order: 130, group: "settings" },
  condition: () => ngwConfig.isAdministrator,
  href: routeURL("webmap.control_panel.settings"),
});
