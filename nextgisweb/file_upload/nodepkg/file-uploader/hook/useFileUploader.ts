import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import settings from "@nextgisweb/file-upload/client-settings";
import type { UploadFile } from "@nextgisweb/gui/antd";
import { errorModalUnlessAbort } from "@nextgisweb/gui/error";
import { makeAbortError } from "@nextgisweb/gui/error/util";
import { formatSize } from "@nextgisweb/gui/util";
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
const msgFileToLarge = gettextf("File is too large, the limit size is {}.");

export function useFileUploader<M extends boolean = false>({
    accept,
    multiple = false as M,
    fileMeta: initMeta,
    inputProps = {},
    afterUpload = [],
    setFileMeta: setInitMeta,
    showUploadList = false,
    openFileDialogOnClick = true,
    showProgressInDocTitle = false,
    maxSize = settings.maxSize,
    onChange,
    onError,
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
            for (const f of options.files) {
                if (f.size > maxSize) {
                    onError?.(msgFileToLarge(formatSize(maxSize)));
                    throw makeAbortError();
                }
            }

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
        [abort, makeSignal, afterUpload, maxSize, onError]
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
                    onError?.(`${info.file.name} file upload failed.`);
                }
            },
            ...restInputProps,
        }),
        [
            onError,
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
