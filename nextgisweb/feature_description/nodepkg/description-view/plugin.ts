/** @plugin */
import { registry } from "@nextgisweb/webmap/identification/registry";

registry.registerLoader(COMP_ID, () => import("./DescriptionView"));
