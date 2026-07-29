/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { panelRegistry } from "@nextgisweb/webmap/panel/registry";

import InfoIcon from "@nextgisweb/icon/material/info";

const DescriptionPanelLazy = lazy(() => import("./DescriptionPanel"));

panelRegistry(COMP_ID, {
  type: "widget",
  widget: DescriptionPanelLazy,
  name: "info",
  title: gettext("Description"),
  icon: <InfoIcon />,
  order: 40,
  applyToTinyMap: true,

  store: () => import("./DescriptionStore"),
  isEnabled: ({ config }) => {
    return !!config.webmapDescription;
  },
});
