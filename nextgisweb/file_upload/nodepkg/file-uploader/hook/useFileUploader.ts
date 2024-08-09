import type { UploadFile } from "antd/lib/upload/interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type {
    FileUploaderOptions,
    Progress,
    UploadProps,
    UploaderMeta,
    UseFileUploaderProps,
} from "../type";
import { fileUploader } from "../util/fileUploader";

const msgProgress = gettext("{} uploaded...");

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
        if (onChange) {
            onChange(meta);
        }
    }, [meta, onChange, setInitMeta]);

    useEffect(() => {
        setProgressText(progress ? msgProgress.replace("{}", progress) : null);
        if (showProgressInDocTitle && progress !== undefined) {
            document.title = progress + " | " + docTitle.current;
        } else if (document.title !== docTitle.current) {
            document.title = docTitle.current;
        }
    }, [progress, showProgressInDocTitle]);

    useEffect(() => {
        setMeta(initMeta);
    }, [initMeta]);

    const onProgress = useCallback((evt: Progress) => {
        if (evt.type === "progress") {
            setProgress(evt.percent);
        }
    }, []);

    const fileUploaderWrapper = useCallback(
        (options: FileUploaderOptions) => {
            abort();
            return fileUploader({ ...options, signal: makeSignal() });
        },
        [abort, makeSignal]
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
                    setMeta(uploadedFiles.filter(Boolean) as UploaderMeta<M>);
                } else {
                    const uploadedFile = uploadedFiles && uploadedFiles[0];
                    if (uploadedFile) {
                        setMeta(uploadedFile as UploaderMeta<M>);
                    }
                }
            } catch (er) {
                console.log(er);
            } finally {
                setProgress(undefined);
                setUploading(false);
            }
        },
        [fileUploaderWrapper, onProgress, multiple]
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
        setMeta,
        uploading,
        onProgress,
        progressText,
        fileUploader: fileUploaderWrapper,
    };
}
