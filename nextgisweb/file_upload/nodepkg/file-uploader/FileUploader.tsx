import { useCallback, useEffect } from "react";
import { Balancer } from "react-wrap-balancer";

import { Button, Upload } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { maxSize } from "@nextgisweb/pyramid/settings!file_upload";

import { useFileUploader } from "./hook/useFileUploader";
import type { FileMeta, FileUploaderProps } from "./type";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import CancelIcon from "@nextgisweb/icon/material/cancel";

import "./FileUploader.less";

const { Dragger } = Upload;

const msgUpload = gettext("Select a file");
const msgDragAndDrop = gettext("or drag and drop here");
const msgMaxSize = formatSize(maxSize) + " " + gettext("max");
const msgStop = gettext("Stop");

function ProgressText({
    abort,
    progressText,
}: {
    abort: (reason?: string | undefined) => void;
    progressText: string;
}) {
    const doAbort = useCallback(() => {
        abort();
    }, [abort]);
    return (
        <div>
            <span>
                <p className="ant-upload-text">{progressText}</p>
            </span>
            <span>
                <Button shape="round" icon={<CancelIcon />} onClick={doAbort}>
                    {msgStop}
                </Button>
            </span>
        </div>
    );
}

export function FileUploader<M extends boolean = false>({
    style,
    accept,
    height = 220,
    fileMeta,
    helpText,
    multiple,
    onChange,
    inputProps = {},
    uploadText = msgUpload,
    afterUpload,
    onUploading,
    setFileMeta,
    showMaxSize = false,
    dragAndDropText = msgDragAndDrop,
    showProgressInDocTitle = true,
}: FileUploaderProps<M>) {
    const { abort, progressText, props, meta, setMeta, uploading } =
        useFileUploader<M>({
            showProgressInDocTitle,
            afterUpload,
            setFileMeta,
            inputProps,
            fileMeta,
            multiple,
            onChange,
            accept,
        });

    useEffect(() => {
        onUploading && onUploading(uploading);
    }, [uploading, onUploading]);

    const InputText = () => {
        const firstMeta = (Array.isArray(meta) ? meta[0] : meta) as FileMeta;
        return firstMeta ? (
            <>
                <p className="ant-upload-text">
                    {firstMeta.name}{" "}
                    <span className="size">{formatSize(firstMeta.size)}</span>
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMeta(undefined);
                        }}
                        type="link"
                        icon={<BackspaceIcon />}
                    />
                </p>
            </>
        ) : (
            <Balancer ratio={0.62}>
                <p className="ant-upload-text">
                    <span className="clickable">{uploadText}</span>{" "}
                    {dragAndDropText}
                </p>
                {helpText ? <p className="ant-upload-hint">{helpText}</p> : ""}
                {showMaxSize && <p className="ant-upload-hint">{msgMaxSize}</p>}
            </Balancer>
        );
    };

    return (
        <Dragger
            {...props}
            className="ngw-file-upload-file-uploader"
            height={height}
            style={style}
            disabled={progressText !== null}
            accept={accept}
        >
            {progressText !== null ? (
                <ProgressText abort={abort} progressText={progressText} />
            ) : (
                <InputText />
            )}
        </Dragger>
    );
}
