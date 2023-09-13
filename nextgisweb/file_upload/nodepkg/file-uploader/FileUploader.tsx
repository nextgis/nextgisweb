import { useEffect } from "react";
import { Balancer } from "react-wrap-balancer";

import { Button, Upload } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util/formatSize";

import { useFileUploader } from "./hook/useFileUploader";
import { FileUploaderProps } from "./type";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { maxSize } from "@nextgisweb/pyramid/settings!file_upload";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import CancelIcon from "@nextgisweb/icon/material/cancel";

import "./FileUploader.less";

const { Dragger } = Upload;

const mUpload = gettext("Select a file");
const mDragAndDrop = gettext("or drag and drop here");
const mMaxSize = formatSize(maxSize) + " " + gettext("max");
const mStop = gettext("Stop");

export function FileUploader({
    accept,
    height = 220,
    fileMeta,
    helpText,
    onChange,
    inputProps = {},
    uploadText = mUpload,
    onUploading,
    setFileMeta,
    showMaxSize = false,
    dragAndDropText = mDragAndDrop,
    showProgressInDocTitle = true,
}: FileUploaderProps) {
    const { abort, progressText, props, meta, setMeta, uploading } =
        useFileUploader({
            showProgressInDocTitle,
            setFileMeta,
            inputProps,
            fileMeta: fileMeta,
            onChange,
            accept,
        });

    useEffect(() => {
        onUploading && onUploading(uploading);
    }, [uploading, onUploading]);

    const InputText = () => {
        const firstMeta = Array.isArray(meta) ? meta[0] : meta;

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
                {showMaxSize && <p className="ant-upload-hint">{mMaxSize}</p>}
            </Balancer>
        );
    };

    const ProgressText = () => (
        <div>
            <span>
                <p className="ant-upload-text">{progressText}</p>
            </span>
            <span>
                <Button shape="round" icon={<CancelIcon />} onClick={abort}>
                    {mStop}
                </Button>
            </span>
        </div>
    );

    return (
        <Dragger
            {...props}
            className="ngw-file-upload-file-uploader"
            height={height}
            disabled={progressText !== null}
            accept={accept}
        >
            {progressText !== null ? <ProgressText /> : <InputText />}
        </Dragger>
    );
}
