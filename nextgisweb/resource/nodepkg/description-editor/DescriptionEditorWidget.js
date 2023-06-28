import { observer } from "mobx-react-lite";
import { TextEditor } from "@nextgisweb/gui/component/text-editor";
import i18n from "@nextgisweb/pyramid/i18n!render";

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

DescriptionEditorWidget.title = i18n.gettext("Description");
DescriptionEditorWidget.order = 80;
