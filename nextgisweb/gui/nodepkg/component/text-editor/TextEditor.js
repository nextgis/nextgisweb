import { PropTypes } from "prop-types";

import { useState, useRef, useCallback, useLayoutEffect } from "react";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import { Editor } from "@nextgisweb/ckeditor";

export const TextEditor = ({ value, onChange, fullHeight = true }) => {
    const [editor, setEditor] = useState();
    const wrapperElement = useRef();

    const onChange_ = (_, editor) => {
        if (onChange) {
            let data = editor.getData();
            onChange(data);
        }
    };

    const updateHeigh = useCallback(() => {
        if (editor) {
            if (wrapperElement.current && wrapperElement.current.parentNode) {
                const parentHeight =
                    wrapperElement.current.parentNode.getBoundingClientRect()
                        .height;
                const toolbarHeight =
                    editor.ui.view.toolbar.element.getBoundingClientRect()
                        .height;
                const height = parentHeight - toolbarHeight;

                // Thanks to this https://github.com/ckeditor/ckeditor5/issues/1708#issuecomment-550536070
                editor.editing.view.change((writer) => {
                    writer.setStyle(
                        "height",
                        height + "px",
                        editor.editing.view.document.getRoot()
                    );
                });

                // A special case for setting the height when the html editor mode is enabled
                const sourceEditingPlugin = editor.plugins.get("SourceEditing");
                if (
                    sourceEditingPlugin &&
                    sourceEditingPlugin.isSourceEditingMode
                ) {
                    const sourceEditingElement =
                        editor.ui.view.element.querySelector(
                            ".ck-source-editing-area"
                        );
                    if (sourceEditingElement) {
                        sourceEditingElement.style.height = height + "px";
                        const textArea = sourceEditingElement.firstChild;
                        if (textArea) {
                            textArea.style.height = height + "px";
                            textArea.style.overflowY = "auto";
                        }
                    }
                }
            }
        }
    }, [editor]);

    // Fit the height of the text editor to the wrapper, watch for changes
    useLayoutEffect(() => {
        let stopSourceEditing;
        let resizeObserver;
        if (fullHeight) {
            resizeObserver = new ResizeObserver(updateHeigh);
            resizeObserver.observe(wrapperElement.current.parentNode);

            const onSourceEdit = () => {
                // setTimeout is used to make sure that the html editor has time to draw
                setTimeout(() => {
                    updateHeigh();
                });
            };

            if (editor) {
                // Watch any changes after clicking on the toolbar buttons, first of all for SourceEdit mode
                editor.data.on("get", onSourceEdit, {
                    priority: "high",
                });
                stopSourceEditing = () => {
                    editor.data.off("get", onSourceEdit);
                };
            }
        }

        return () => {
            if (stopSourceEditing) {
                stopSourceEditing();
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [editor, fullHeight, updateHeigh]);

    return (
        <div ref={wrapperElement}>
            <CKEditor
                editor={Editor}
                data={value}
                onChange={onChange_}
                onReady={(editor) => {
                    setEditor(editor);
                }}
            />
        </div>
    );
};

TextEditor.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func,
    fullHeight: PropTypes.bool,
};
