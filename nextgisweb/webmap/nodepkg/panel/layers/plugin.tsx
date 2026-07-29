/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import LayersIcon from "@nextgisweb/icon/material/layers";

const LayersPanelLazy = lazy(() => import("./LayersPanel"));

registry.register(COMP_ID, {
  type: "widget",
  widget: LayersPanelLazy,
  name: "layers",
  title: gettext("Layers"),
  icon: <LayersIcon />,
  order: 10,
  applyToTinyMap: true,
});
