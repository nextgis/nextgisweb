/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/webmap/identification/registry";

const DescriptionViewLazy = lazy(() => import("./DescriptionView"));

registry.register(COMP_ID, DescriptionViewLazy);
