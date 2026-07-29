/** @plugin */
import { lazy } from "react";

import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

const CompanyLogoControlLazy = lazy(() => import("./CompanyLogoControl"));

mapControlRegistry(COMP_ID, {
  key: "cl",
  order: 0,
  component: CompanyLogoControlLazy,
  embeddedShowMode: "always",
  position: "bottom-right",
});
