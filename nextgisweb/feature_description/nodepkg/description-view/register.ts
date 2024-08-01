/** @plugin */
import { registry } from "@nextgisweb/webmap/panel/identification/registry";

registry.register(
    { component: COMP_ID },
    { import: () => import("./DescriptionView") }
);
