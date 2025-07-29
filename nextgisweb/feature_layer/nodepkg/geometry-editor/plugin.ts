/** @plugin */
import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { GEOMETRY_KEY } from "./constant";

registry.register(COMP_ID, {
    widget: () => import("./GeometryEditor"),
    store: () => import("./GeometryEditorStore"),
    label: gettext("Geometry"),
    identity: GEOMETRY_KEY,
    order: 100,
});
