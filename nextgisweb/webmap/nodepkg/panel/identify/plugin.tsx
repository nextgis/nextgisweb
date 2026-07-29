/** @plugin */

import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { panelRegistry } from "@nextgisweb/webmap/panel/registry";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";

const IdentifyPanelLazy = lazy(() => import("./IdentifyPanel"));

panelRegistry(COMP_ID, {
  type: "widget",
  widget: IdentifyPanelLazy,
  store: () => import("./IdentifyStore"),
  name: "identify",
  title: gettext("Identify"),
  icon: <IdentifyIcon />,
  order: 15,
  applyToTinyMap: true,
});
