import type { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { CKEditor } from "@ckeditor/ckeditor5-react";

import { Editor } from "@nextgisweb/ckeditor";

import { useSourceEditingWorkAround } from "./hook/useSourceEditingWorkAround";
import type { TextEditorProps } from "./type";

import "./TextEditor.less";

export const TextEditor = ({
    value,
    onChange,
    parentHeight = true,
    border = true,
}: TextEditorProps) => {
    /**
     * Without the Source Editor plugin, it would be possible to use the component just like that
     * <CKEditor editor={Editor} data={value} onChange={onChange} />
     * Otherwise an endless onChange call may happened by unclear circumstances.
     * This hook is needed to solve this problem.
     */
    const { setEditor } = useSourceEditingWorkAround({ value, onChange });

    return (
        <div
            className={
                "ngw-gui-component-text-editor" +
                (!border ? " borderless" : "") +
                (parentHeight ? " parent-height" : "")
            }
        >
            <CKEditor
                editor={Editor}
                onReady={(editor: ClassicEditor) => {
                    setEditor(editor);
                }}
            />
        </div>
    );
};
