/** @plugin */
import { lazy } from "react";

import { registry } from "@nextgisweb/webmap/identification/registry";

const AttachmentTableViewLazy = lazy(() => import("./AttachmentTableView"));

registry.register(COMP_ID, AttachmentTableViewLazy);
