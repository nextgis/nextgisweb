import { useEffect, useRef } from "react";
import { PropTypes } from "prop-types";
import { useCodeMirror } from "./hook/useCodeMirror";

export function Code({ whenReady, ...props }) {
    const editorRef = useRef(null);
    const editor = useCodeMirror({ target: editorRef, ...props });

    useEffect(() => {
        if (editor) {
            if (whenReady) {
                whenReady(editor);
            }
        }
    }, [editor]);

    return (
        <div
            ref={editorRef}
            style={{
                height: "100%",
                minHeight: props.autoHeight && props.minHeight,
            }}
        ></div>
    );
}

Code.propTypes = {
    lang: PropTypes.string,
    value: PropTypes.string,
    readOnly: PropTypes.bool,
    fold: PropTypes.bool,
    autoHeight: PropTypes.bool,
    minHeight: PropTypes.string,
    maxHeight: PropTypes.string,
    lineNumbers: PropTypes.bool,
    whenReady: PropTypes.func,
};
