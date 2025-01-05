import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import { TextEditor } from "@nextgisweb/gui/component/text-editor";

import DescriptionEditorStore from "./DescriptionEditorStore";
import type EditorStore from "./DescriptionEditorStore";

const DescriptionEditor = observer(
    ({ store }: EditorWidgetProps<EditorStore>) => {
        const [store_] = useState<DescriptionEditorStore>(() => {
            if (store) return store;
            return new DescriptionEditorStore();
        });

        const onChange = useCallback(
            (val: string) => {
                store_.update(val ? val : null);
            },
            [store_]
        );

        return (
            <TextEditor
                value={store_.value || ""}
                onChange={onChange}
                border={false}
            />
        );
    }
);

DescriptionEditor.displayName = "DescriptionEditor";

export default DescriptionEditor;
