/** @plugin */

import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

registry.register(COMP_ID, {
    widget: () => import("./DescriptionEditor"),
    store: () => import("./DescriptionEditorStore"),
    label: gettext("Description"),
    identity: "description",
    order: 20,
});
