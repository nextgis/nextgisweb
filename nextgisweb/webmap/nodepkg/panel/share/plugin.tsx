/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import ShareIcon from "@nextgisweb/icon/material/share";

registry.register(COMP_ID, {
  type: "widget",
  widget: () => import("./SharePanel"),
  name: "share",
  title: gettext("Share"),
  icon: <ShareIcon />,
  order: 60,
});
