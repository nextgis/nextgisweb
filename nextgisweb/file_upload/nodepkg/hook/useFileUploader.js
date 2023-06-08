import { useEffect, useState, useMemo, useCallback } from "react";

import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { fileUploader } from "@nextgisweb/file-upload";
import { message } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!file_upload";

export function useFileUploader({
    /** File types that can be accepted. See input accept {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept Attribute}  */
    accept,
    fileMeta: initMeta,
    multiple = false,
    onChange,
    inputProps = {},
    setFileMeta: setInitMeta,
    showUploadList = false,
    openFileDialogOnClick = true,
    showProgressInDocTitle = false,
}) {
    const { makeSignal, abort } = useAbortController();

    const [docTitle] = useState(document.title);

    const [fileList, setFileList] = useState([]);

    const [progressText, setProgressText] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [meta, setMeta] = useState(initMeta);

    useEffect(() => {
        if (setInitMeta) {
            setInitMeta(meta);
        }
        if (onChange) {
            onChange(meta);
        }
        // do not include `onChange` to avoid a looped call
    }, [meta, setInitMeta]);

    useEffect(() => {
        setMeta(initMeta);
    }, [initMeta]);

    const onProgress = useCallback(
        (evt) => {
            if (evt.type === "progress") {
                setProgressText(evt.percent + i18n.gettext(" uploaded..."));
                if (showProgressInDocTitle) {
                    document.title = evt.percent + " | " + docTitle;
                }
            }
        },
        [docTitle, showProgressInDocTitle]
    );

    const fileUploaderWrapper = useCallback(
        (options) => {
            abort();
            return fileUploader({ ...options, signal: makeSignal() });
        },
        [abort, makeSignal]
    );

    const upload = useCallback(
        async (files) => {
            setUploading(true);
            try {
                const uploadedFiles = await fileUploaderWrapper({
                    files,
                    onProgress,
                });
                uploadedFiles.forEach((f, i) => {
                    f._file = files[i];
                })
                if (multiple) {
                    setMeta(uploadedFiles.filter(Boolean));
                } else {
                    const uploadedFile = uploadedFiles && uploadedFiles[0];
                    if (uploadedFile) {
                        setMeta(uploadedFile);
                    }
                }
            } catch (er) {
                console.log(er);
            } finally {
                setProgressText(null);
                setUploading(false);
            }
        },
        [fileUploaderWrapper, onProgress, multiple]
    );

    const { onChange: inputPropsOnChange, ...restInputProps } = inputProps;

    const props = useMemo(
        () => ({
            name: "file",
            accept,
            fileList,
            multiple,
            showUploadList,
            openFileDialogOnClick,
            customRequest: ({ file, onSuccess }) => onSuccess(file),
            onChange(info) {
                if (inputPropsOnChange) {
                    inputPropsOnChange(info);
                }
                const done = info.fileList.every((f) => f.status === "done");
                const error = info.fileList.some((f) => f.status === "error");
                setFileList([...info.fileList]);
                if (done) {
                    upload(info.fileList.map((f) => f.originFileObj));
                    setFileList([]);
                } else if (error) {
                    message.error(`${info.file.name} file upload failed.`);
                }
            },
            ...restInputProps,
        }),
        [
            upload,
            accept,
            multiple,
            fileList,
            showUploadList,
            restInputProps,
            inputPropsOnChange,
            openFileDialogOnClick,
        ]
    );

    return {
        meta,
        abort,
        props,
        upload,
        setMeta,
        uploading,
        onProgress,
        progressText,
        fileUploader: fileUploaderWrapper,
    };
}
