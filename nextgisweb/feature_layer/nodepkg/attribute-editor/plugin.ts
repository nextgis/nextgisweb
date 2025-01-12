/** @plugin */
import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ATTRIBUTES_KEY } from "../feature-editor/constant";

registry.register(COMP_ID, {
    widget: () => import("./AttributeEditor"),
    store: () => import("./AttributeEditorStore"),
    label: gettext("Attributes"),
    identity: ATTRIBUTES_KEY,
    order: 10,
});
