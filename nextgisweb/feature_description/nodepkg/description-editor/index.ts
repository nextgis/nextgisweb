/** @entrypoint */
import type { EditorWidgetRegister } from "@nextgisweb/feature-layer/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import DescriptionEditorStore from "./DescriptionEditorStore";

const msgTitle = gettext("Description");

const editorWidgetRegister: EditorWidgetRegister<
    string | null,
    DescriptionEditorStore
> = {
    component: () => import("./DescriptionEditor"),
    store: DescriptionEditorStore,
    label: msgTitle,
};

export default editorWidgetRegister;
