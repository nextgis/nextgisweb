import { useEffect } from "react";

import CancelIcon from "@material-icons/svg/cancel";

import { Button, Upload } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";
import { formatSize } from "@nextgisweb/gui/util/formatSize";

import { useFileUploader } from "../hook/useFileUploader";
import { FileUploaderType } from "../type/FileUploaderType";

import settings from "@nextgisweb/pyramid/settings!file_upload";

import "./FileUploader.less";

const { Dragger } = Upload;

const UPLOAD_TEXT = i18n.gettext("Select a file");
const DND_TEXT = i18n.gettext("or drag and drop here");
const OVERWRITE_TEXT = i18n.gettext("Overwrite?");
const MAX_SIZE = formatSize(settings.max_size) + " " + i18n.gettext("max");

export function FileUploader({
    helpText,
    uploadText = UPLOAD_TEXT,
    dragAndDropText = DND_TEXT,
    onChange,
    showProgressInDocTitle = true,
    height = "220px",
    accept,
    inputProps = {},
    fileMeta,
    setFileMeta,
    onUploading,
    showMaxSize = false,
}) {
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

    const InputText = () =>
        meta ? (
            <>
                <p className="ant-upload-text">
                    {meta.name}{" "}
                    <span className="size">{formatSize(meta.size)}</span>
                    <Button
                        type="link"
                        onClick={() => {
                            setMeta(null);
                        }}
                    >
                        {OVERWRITE_TEXT}
                    </Button>
                </p>
            </>
        ) : (
            <>
                <p className="ant-upload-text">
                    <span className="clickable">{uploadText}</span>{" "}
                    {dragAndDropText}
                </p>
                {helpText ? <p className="ant-upload-hint">{helpText}</p> : ""}
                {showMaxSize && <p className="ant-upload-hint">{MAX_SIZE}</p>}
            </>
        );

    const ProgressText = () => (
        <div>
            <span>
                <p className="ant-upload-text">{progressText}</p>
            </span>
            <span>
                <Button shape="round" icon={<CancelIcon />} onClick={abort}>
                    {i18n.gettext("Stop")}
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

FileUploader.propTypes = FileUploaderType;
