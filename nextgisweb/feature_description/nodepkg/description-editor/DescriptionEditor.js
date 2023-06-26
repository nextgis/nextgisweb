import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useMemo, useState, useRef, useCallback, useLayoutEffect } from "react";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import { Editor } from "@nextgisweb/ckeditor";

export const DescriptionEditor = observer(({ store, extension }) => {
    const { extensions, setExtension } = store;
    const [editor, setEditor] = useState();
    const wrapperElement = useRef();

    const dataSource = useMemo(() => {
        const attachment = extensions[extension];
        return attachment || [];
    }, [extensions, extension]);

    const onChange = (_, editor) => {
        let data = editor.getData();
        if (!data) {
            data = null;
        }
        setExtension(extension, data);
    };

    const updateHeigh = useCallback(() => {
        if (editor) {
            const parentHeight =
                wrapperElement.current.parentNode.getBoundingClientRect()
                    .height;
            const toolbarHeight =
                editor.ui.view.toolbar.element.getBoundingClientRect().height;
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
    }, [editor]);

    // Fit the height of the text editor to the wrapper, watch for changes
    useLayoutEffect(() => {
        let stopSourceEditing;
        const resizeObserver = new ResizeObserver(updateHeigh);
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

        return () => {
            if (stopSourceEditing) {
                stopSourceEditing();
            }
            resizeObserver.disconnect();
        };
    }, [editor, updateHeigh]);

    return (
        <div ref={wrapperElement}>
            <CKEditor
                editor={Editor}
                data={dataSource}
                onChange={onChange}
                onReady={(editor) => {
                    setEditor(editor);
                }}
            />
        </div>
    );
});

DescriptionEditor.propTypes = {
    store: PropTypes.object,
    extension: PropTypes.string,
};
