/** @entrypoint */
import AttachmentEditorStore from "./AttachmentEditorStore";

import i18n from "@nextgisweb/pyramid/i18n";

import type { EditorWidgetRegister } from "@nextgisweb/feature-layer/type";
import type { DataSource } from "./type";

const titleText = i18n.gettext("Attachments");

const editorWidgetRegister: EditorWidgetRegister<DataSource[]> = {
    component: () => import("./AttachmentEditor"),
    store: AttachmentEditorStore,
    label: titleText,
};

export default editorWidgetRegister;
