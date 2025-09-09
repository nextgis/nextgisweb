/** @plugin */
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

mapControlRegistry(COMP_ID, {
    key: "cl",
    order: 0,
    component: () => import("./CompanyLogoControl"),
    embeddedShowMode: "always",
    position: "bottom-right",
});
