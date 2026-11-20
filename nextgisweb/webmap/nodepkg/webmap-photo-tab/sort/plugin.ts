/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/webmap/webmap-photo-tab/registry";

registry.register(COMP_ID, {
  key: "sort",
  order: 20,
  component: lazy(() => import("./SortTool")),
});
