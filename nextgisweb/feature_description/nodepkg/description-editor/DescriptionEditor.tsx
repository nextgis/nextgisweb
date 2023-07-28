import { useMemo } from "react";
import { observer } from "mobx-react-lite";

import { TextEditor } from "@nextgisweb/gui/component/text-editor";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";

const DescriptionEditor = observer(({ store }: EditorWidgetProps<string>) => {
    const value = useMemo(() => {
        if (store.value) {
            return store.value;
        }
        return "";
    }, [store.value]);

    const onChange = (val: string) => {
        if (val) {
            store.value = val;
        } else {
            store.value = null;
        }
    };

    return <TextEditor value={value} onChange={onChange} border={false} />;
});

export default DescriptionEditor;
