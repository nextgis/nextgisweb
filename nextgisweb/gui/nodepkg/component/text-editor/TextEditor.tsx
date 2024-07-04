import { CKEditor } from "@ckeditor/ckeditor5-react";
import type { SourceEditing } from "@ckeditor/ckeditor5-source-editing";
import { useCallback, useEffect, useRef } from "react";

import { Editor } from "@nextgisweb/ckeditor";

import "./TextEditor.less";

export interface TextEditorProps {
    value: string;
    onChange?: (val: string) => void;
    parentHeight?: boolean;
    border?: boolean;
}

export const TextEditor = ({
    value,
    onChange: onChangeProp,
    parentHeight = true,
    border = true,
}: TextEditorProps) => {
    const editorRef = useRef<typeof Editor>(null);

    const onChange = useCallback(
        (editor: typeof Editor) => {
            if (onChangeProp) {
                const editorData = editor.getData();
                onChangeProp(editorData);
            }
        },
        [onChangeProp]
    );

    useEffect(() => {
        const editor = editorRef.current;
        if (editor) {
            const sourceEditingPlugin = editor.plugins.get(
                "SourceEditing"
            ) as SourceEditing;
            const updateEditorData = () => {
                onChange(editor);
            };

            // This function handles the change of source editing mode.
            // It ensures that onChange is triggered when the source editing mode is active.
            const handleSourceEditingModeChange = () => {
                if (sourceEditingPlugin.isSourceEditingMode) {
                    // When in source editing mode, we need to manually update the data
                    // because the onChange event does not trigger automatically.
                    editor.ui.on("update", updateEditorData);
                } else {
                    editor.ui.off("update", updateEditorData);
                }
            };

            sourceEditingPlugin.on(
                "change:isSourceEditingMode",
                handleSourceEditingModeChange
            );

            return () => {
                editor.ui.off("update", updateEditorData);
                sourceEditingPlugin.off(
                    "change:isSourceEditingMode",
                    handleSourceEditingModeChange
                );
            };
        }
    }, [onChange]);

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
                data={value}
                onReady={(editor) => {
                    editorRef.current = editor;
                }}
                onChange={(s, editor) => {
                    onChange(editor);
                }}
            />
        </div>
    );
};
