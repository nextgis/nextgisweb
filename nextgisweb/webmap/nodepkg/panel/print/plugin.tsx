/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import PrintIcon from "@nextgisweb/icon/material/print";

const PrintPanelLazy = lazy(() => import("./PrintPanel"));

registry.register(COMP_ID, {
  type: "widget",
  widget: PrintPanelLazy,
  name: "print",
  title: gettext("Print map"),
  desktopOnly: true,
  icon: <PrintIcon />,
  order: 70,
});
