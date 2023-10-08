import { useEffect, useRef } from "react";

import { useCodeMirror } from "./hook/useCodeMirror";
import type { CodeOptions, Editor } from "./type";

export interface CodeProps extends CodeOptions {
    whenReady?: (editor: Editor) => void;
}

export function Code({ whenReady, ...props }: CodeProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const editor = useCodeMirror({ target: editorRef, ...props });

    useEffect(() => {
        if (editor) {
            if (whenReady) {
                whenReady(editor);
            }
        }
    }, [editor, whenReady]);

    return (
        <div
            ref={editorRef}
            style={{
                height: "100%",
                minHeight: (props.autoHeight && props.minHeight) || undefined,
            }}
        ></div>
    );
}
