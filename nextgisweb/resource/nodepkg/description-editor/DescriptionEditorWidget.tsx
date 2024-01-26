import { observer } from "mobx-react-lite";

import { TextEditor } from "@nextgisweb/gui/component/text-editor";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { EditorWidgetComponent, EditorWidgetProps } from "../type";

import type { DescriptionEditorStore } from "./DescriptionEditorStore";

export const DescriptionEditorWidget: EditorWidgetComponent<
    EditorWidgetProps<DescriptionEditorStore>
> = observer(({ store }) => {
    const onChange = (value: string) => {
        store.setValue(value ? value : null);
    };
    return (
        <TextEditor
            value={store.value ? store.value : ""}
            onChange={onChange}
            border={false}
        />
    );
});

DescriptionEditorWidget.title = gettext("Description");
DescriptionEditorWidget.order = 80;
