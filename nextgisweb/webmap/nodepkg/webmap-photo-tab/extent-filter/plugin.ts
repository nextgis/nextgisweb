/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/webmap/webmap-photo-tab/registry";

registry.register(COMP_ID, {
  key: "extent",
  order: 10,
  component: lazy(() => import("./ExtentFilterTool")),
});
