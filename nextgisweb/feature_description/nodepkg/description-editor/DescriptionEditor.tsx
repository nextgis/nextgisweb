import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import { TextEditor } from "@nextgisweb/gui/component/text-editor";

import DescriptionEditorStore from "./DescriptionEditorStore";

const DescriptionEditor = observer(
    ({ store }: EditorWidgetProps<string | null>) => {
        const [store_] = useState(() => {
            if (store) {
                return store;
            }
            return new DescriptionEditorStore();
        });

        const value = useMemo(() => {
            if (store_.value) {
                return store_.value;
            }
            return "";
        }, [store_.value]);

        const onChange = (val: string) => {
            if (val) {
                store_.value = val;
            } else {
                store_.value = null;
            }
        };

        return <TextEditor value={value} onChange={onChange} border={false} />;
    }
);

export default DescriptionEditor;
