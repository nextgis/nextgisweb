/** @plugin */
import { registry } from "@nextgisweb/webmap/identification/registry";

registry.register(COMP_ID, () => import("./DescriptionView"));
