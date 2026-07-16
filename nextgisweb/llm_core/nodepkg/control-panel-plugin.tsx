/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { registerControlPanelItem } from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "llm_settings",
  label: gettext("LLM Settings"),
  menu: { order: 150, group: "settings" },
  condition: () => false,
  href: routeURL("llm_core.control_panel.llm_settings"),
});
