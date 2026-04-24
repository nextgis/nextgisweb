/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { registerControlPanelItem } from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import settings from "./client-settings";

const isAdministrator = ngwConfig.isAdministrator;

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "journal",
  label: gettext("Journal"),
  menu: { order: 5, group: "settings" },
  condition: () => isAdministrator && settings.backend.dbase,
  href: routeURL("audit.control_panel.journal.browse"),
});
