import type { EditorWidgetRegister } from "@nextgisweb/feature-layer/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import AttributeEditorStore from "./AttributeEditorStore";
import type { NgwAttributeValue } from "./type";

const msgTitle = gettext("Attributes");

const editorWidgetRegister: EditorWidgetRegister<
    NgwAttributeValue | null,
    AttributeEditorStore
> = {
    component: () => import("./AttributeEditor"),
    store: AttributeEditorStore,
    label: msgTitle,
};

export default editorWidgetRegister;
