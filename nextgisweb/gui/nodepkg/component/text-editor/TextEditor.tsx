import { CKEditor } from "@ckeditor/ckeditor5-react";
import { Editor } from "@nextgisweb/ckeditor";

import { TextEditorProps } from "./type";

import "./TextEditor.less";

export const TextEditor = ({
    value,
    onChange,
    parentHeight = true,
    border = true,
}: TextEditorProps) => {
    const onChange_ = (_, editor) => {
        if (onChange) {
            const data = editor.getData();
            onChange(data);
        }
    };

    return (
        <div
            className={
                "ngw-gui-component-text-editor" +
                (!border ? " borderless" : "") +
                (parentHeight ? " parent-height" : "")
            }
        >
            <CKEditor editor={Editor} data={value} onChange={onChange_} />
        </div>
    );
};
