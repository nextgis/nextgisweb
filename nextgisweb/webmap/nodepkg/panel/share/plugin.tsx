/** @plugin */

import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import ShareIcon from "@nextgisweb/icon/material/share";

const SharePanelLazy = lazy(() => import("./SharePanel"));

registry.register(COMP_ID, {
  type: "widget",
  widget: SharePanelLazy,
  name: "share",
  title: gettext("Share"),
  icon: <ShareIcon />,
  order: 60,
});
