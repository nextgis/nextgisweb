import type { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import type { DocumentChangeEvent } from "@ckeditor/ckeditor5-engine";
import type { SourceEditing } from "@ckeditor/ckeditor5-source-editing";
import { useEffect, useState } from "react";

import type { TextEditorProps } from "../type";

export function useSourceEditingWorkAround({
    value,
    onChange,
}: Pick<TextEditorProps, "value" | "onChange">) {
    const [editor, setEditor] = useState<ClassicEditor>();

    useEffect(() => {
        const toDestroy: (() => void)[] = [];
        if (editor) {
            const onChange_ = () => {
                if (onChange) {
                    const editorData = editor.getData();
                    onChange(editorData);
                }
            };
            const modelDocument = editor.model.document;
            const stopListen = () => {
                modelDocument.off("change:data", onChange_);
            };
            const startListen = () => {
                stopListen();
                modelDocument.on<DocumentChangeEvent>("change:data", onChange_);
            };

            const onSourceEditingMode = (
                _evt: unknown,
                _name: string,
                isSourceEditingMode: boolean
            ) => {
                if (isSourceEditingMode) {
                    stopListen();
                } else {
                    onChange_();
                    startListen();
                }
            };
            toDestroy.push(stopListen);

            const sourceEditingPlugin = editor.plugins.get(
                "SourceEditing"
            ) as SourceEditing;
            if (sourceEditingPlugin) {
                sourceEditingPlugin.on(
                    "change:isSourceEditingMode",
                    onSourceEditingMode
                );

                if (!sourceEditingPlugin.isSourceEditingMode) {
                    startListen();
                }

                toDestroy.push(() => {
                    sourceEditingPlugin.off(
                        "change:isSourceEditingMode",
                        onSourceEditingMode
                    );
                });
            }
        }
        return () => {
            toDestroy.forEach((d) => d());
        };
    }, [editor, onChange]);

    useEffect(() => {
        if (editor) {
            const editorData = editor.getData();
            if (editorData !== value) {
                editor.setData(value);
                const sourceEditingPlugin = editor.plugins.get(
                    "SourceEditing"
                ) as SourceEditing;
                if (
                    sourceEditingPlugin &&
                    sourceEditingPlugin.isSourceEditingMode
                ) {
                    // Refresh source editor content if the data updated outside
                    sourceEditingPlugin.isSourceEditingMode = false;
                    sourceEditingPlugin.isSourceEditingMode = true;
                }
            }
        }
    }, [value, editor]);

    return { setEditor };
}
