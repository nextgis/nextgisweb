/** @plugin */
import { registry } from "@nextgisweb/webmap/panel/identification/registry";

registry.registerLoader(COMP_ID, () => import("./DescriptionView"));
