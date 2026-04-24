/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { registerControlPanelItem } from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

const isAdministrator = ngwConfig.isAdministrator;

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "versioning",
  label: gettext("Feature versioning"),
  menu: { order: 120, group: "settings" },
  condition: () => isAdministrator,
  href: routeURL("feature_layer.control_panel.versioning"),
});
