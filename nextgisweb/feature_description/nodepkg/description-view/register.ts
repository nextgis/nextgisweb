/** @plugin */
import { registry } from "@nextgisweb/webmap/panel/identification/registry";

registry.register(COMP_ID, () => import("./DescriptionView"));
