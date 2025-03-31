import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import type { UploadFile } from "@nextgisweb/gui/antd";
import { errorModalUnlessAbort } from "@nextgisweb/gui/error";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettextf } from "@nextgisweb/pyramid/i18n";

import type {
    FileUploaderOptions,
    Progress,
    UploadProps,
    UploaderMeta,
    UseFileUploaderProps,
} from "../type";
import { fileUploader } from "../util/fileUploader";

const msgProgressFmt = gettextf("{} uploaded...");

export function useFileUploader<M extends boolean = false>({
    accept,
    fileMeta: initMeta,
    multiple = false as M,
    onChange,
    inputProps = {},
    setFileMeta: setInitMeta,
    showUploadList = false,
    openFileDialogOnClick = true,
    showProgressInDocTitle = false,
    afterUpload = [],
}: UseFileUploaderProps<M>) {
    const { makeSignal, abort } = useAbortController();

    const docTitle = useRef(document.title);

    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const [progress, setProgress] = useState<string>();
    const [progressText, setProgressText] = useState<string | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [meta, setMeta] = useState<UploaderMeta<M> | undefined>(initMeta);

    useEffect(() => {
        if (setInitMeta) {
            setInitMeta(meta);
        }
    }, [meta, setInitMeta]);

    useEffect(() => {
        const originalDocTitle = docTitle.current;
        setProgressText(
            progress !== undefined ? msgProgressFmt(String(progress)) : null
        );
        if (showProgressInDocTitle && progress !== undefined) {
            document.title = `${progress} | ${originalDocTitle}`;
        } else if (document.title !== originalDocTitle) {
            document.title = originalDocTitle;
        }

        return () => {
            document.title = originalDocTitle;
        };
    }, [progress, showProgressInDocTitle]);

    useEffect(() => {
        setMeta(initMeta);
    }, [initMeta]);

    const onProgress = useCallback((evt: Progress) => {
        if (evt.type === "progress") {
            setProgress(evt.percent);
        }
    }, []);

    const clearMeta = useCallback(() => {
        setMeta(undefined);
        onChange?.(undefined);
    }, [onChange]);

    const fileUploaderWrapper = useCallback(
        async (options: FileUploaderOptions) => {
            abort();
            const signal = makeSignal();
            const uploadedFiles = await fileUploader({
                ...options,
                signal,
            });

            for (const { message, loader } of afterUpload) {
                setProgressText(message);
                try {
                    await loader(uploadedFiles, { signal });
                } catch (er) {
                    console.log(er);
                    return [];
                }
            }

            setProgressText(null);

            return signal.aborted ? [] : uploadedFiles;
        },
        [abort, makeSignal, afterUpload]
    );

    const upload = useCallback(
        async (files: File[]) => {
            setUploading(true);
            try {
                const uploadedFiles = await fileUploaderWrapper({
                    files,
                    onProgress,
                });
                uploadedFiles.forEach((f, i) => {
                    f._file = files[i];
                });
                if (multiple) {
                    const metaToSet = uploadedFiles.filter(
                        Boolean
                    ) as UploaderMeta<M>;
                    setMeta(metaToSet);
                    onChange?.(metaToSet);
                } else {
                    const uploadedFile = uploadedFiles && uploadedFiles[0];
                    if (uploadedFile) {
                        const metaToSet = uploadedFile as UploaderMeta<M>;
                        setMeta(metaToSet);
                        onChange?.(metaToSet);
                    }
                }
            } catch (err) {
                errorModalUnlessAbort(err);
            } finally {
                setProgress(undefined);
                setUploading(false);
            }
        },
        [fileUploaderWrapper, onProgress, multiple, onChange]
    );

    const { onChange: inputPropsOnChange, ...restInputProps } = inputProps;

    const props = useMemo<UploadProps>(
        () => ({
            name: "file",
            accept,
            fileList,
            multiple,
            showUploadList,
            openFileDialogOnClick,
            customRequest: ({ file, onSuccess }) => {
                if (onSuccess) {
                    onSuccess(file);
                }
            },
            onChange(info) {
                if (inputPropsOnChange) {
                    inputPropsOnChange(info);
                }
                const done = info.fileList.every((f) => f.status === "done");
                const error = info.fileList.some((f) => f.status === "error");
                setFileList([...info.fileList]);
                if (done) {
                    upload(info.fileList.map((f) => f.originFileObj as File));
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
        clearMeta,
        uploading,
        onProgress,
        progressText,
        fileUploader: fileUploaderWrapper,
    };
}
