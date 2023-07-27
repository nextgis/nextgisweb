import { observer } from "mobx-react-lite";

import { TextEditor } from "@nextgisweb/gui/component/text-editor";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";

const DescriptionEditor = observer(({ store }: EditorWidgetProps<string>) => {
    return (
        <TextEditor value={store.value} onChange={store.load} border={false} />
    );
});

export default DescriptionEditor;
