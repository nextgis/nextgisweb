/** @entrypoint */
import DescriptionEditorStore from "./DescriptionEditorStore";

import i18n from "@nextgisweb/pyramid/i18n";

import type { EditorWidgetRegister } from "@nextgisweb/feature-layer/type";

const titleText = i18n.gettext("Description");

const editorWidgetRegister: EditorWidgetRegister<string> = {
    component: () => import("./DescriptionEditor"),
    store: DescriptionEditorStore,
    label: titleText,
};

export default editorWidgetRegister;
