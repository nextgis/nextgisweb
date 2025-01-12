/** @plugin */
import { registry } from "@nextgisweb/feature-layer/feature-editor/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

registry.register(COMP_ID, {
    widget: () => import("./AttachmentEditor"),
    store: () => import("./AttachmentEditorStore"),
    label: gettext("Attachments"),
    identity: "attachment",
    order: 30,
});
