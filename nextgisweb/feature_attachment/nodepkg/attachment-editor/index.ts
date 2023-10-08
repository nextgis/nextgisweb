/** @entrypoint */
import type { EditorWidgetRegister } from "@nextgisweb/feature-layer/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import AttachmentEditorStore from "./AttachmentEditorStore";
import type { DataSource } from "./type";

const msgTitle = gettext("Attachments");

const editorWidgetRegister: EditorWidgetRegister<
    DataSource[] | null,
    AttachmentEditorStore
> = {
    component: () => import("./AttachmentEditor"),
    store: AttachmentEditorStore,
    label: msgTitle,
};

export default editorWidgetRegister;
