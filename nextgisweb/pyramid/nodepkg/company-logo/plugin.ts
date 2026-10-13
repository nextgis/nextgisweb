/** @plugin */
import { lazy } from "react";

import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

const CompanyLogoControlLazy = lazy(() => import("./CompanyLogoControl"));

mapControlRegistry(COMP_ID, {
  key: "cl",
  isEnabled: () => pyramidSettings.company_logo.enabled,
  order: 0,
  component: CompanyLogoControlLazy,
  embeddedShowMode: "always",
  position: "bottom-right",
});
