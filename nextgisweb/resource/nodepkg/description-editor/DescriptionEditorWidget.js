import { observer } from "mobx-react-lite";

import { TextEditor } from "@nextgisweb/gui/component/text-editor";
import { gettext } from "@nextgisweb/pyramid/i18n";

export const DescriptionEditorWidget = observer(({ store }) => {
    const onChange = (value) => {
        store.value = value ? value : null;
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
