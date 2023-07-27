import AttributeEditorStore from "./AttributeEditorStore";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { EditorWidgetRegister } from "@nextgisweb/feature-layer/type";
import type { NgwAttributeValue } from "./type";

const titleText = gettext("Attributes");

const editorWidgetRegister: EditorWidgetRegister<NgwAttributeValue> = {
    component: () => import("./AttributeEditor"),
    store: AttributeEditorStore,
    label: titleText,
};

export default editorWidgetRegister;
