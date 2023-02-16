import CancelIcon from "@material-icons/svg/cancel";

import { useEffect, useState } from "react";

import { InboxOutlined } from "@ant-design/icons";
import { Button, message, Upload } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!file_upload";
import { formatSize } from "@nextgisweb/gui/util/formatSize";

import { useFileUploader } from "../hook/useFileUploader";
import { FileUploaderType } from "../type/FileUploaderType";

const { Dragger } = Upload;

const UPLOAD_TEXT = i18n.gettext("Select a file");
const DND_TEXT = i18n.gettext("or drag and drop here");
const OVERWRITE_TEXT = i18n.gettext("Overwrite?");

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
}) {
    const { upload: fileUploader, abort: abortFileUpload } = useFileUploader();
    const [progressText, setProgressText] = useState(null);
    const [fileMeta_, setFileMeta_] = useState(fileMeta);
    const [docTitle] = useState(document.title);

    useEffect(() => {
        if (setFileMeta) {
            setFileMeta(fileMeta_);
        }
    }, [fileMeta_, onChange, setFileMeta]);

    useEffect(() => {
        setFileMeta_(fileMeta);
        if (onChange) {
            onChange(fileMeta);
        }
    }, [fileMeta, onChange]);

    const abort = () => {
        abortFileUpload();
    };

    const onProgress = (evt) => {
        if (evt.type === "progress") {
            setProgressText(evt.percent + i18n.gettext(" uploaded..."));
            if (showProgressInDocTitle) {
                document.title = evt.percent + " | " + docTitle;
            }
        }
    };

    const upload = async (files) => {
        try {
            const uploadedFiles = await fileUploader({
                files,
                onProgress,
            });
            const uploadedFile = uploadedFiles && uploadedFiles[0];
            if (uploadedFile) {
                setFileMeta_(uploadedFile);
            }
        } catch (er) {
            console.log(er);
        } finally {
            setProgressText(null);
        }
    };
    const { onChange: inputPropsOnChange, ...restInputProps } = inputProps;
    const props = {
        name: "file",
        multiple: false,
        showUploadList: false,
        customRequest: ({ file, onSuccess }) => onSuccess(file),
        onChange(info) {
            if (inputPropsOnChange) {
                inputPropsOnChange(info);
            }
            const { status } = info.file;
            if (status === "done") {
                upload([info.file.originFileObj]);
            } else if (status === "error") {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
        ...restInputProps,
    };

    const InputText = () => (
        <>
            <p className="ant-upload-text">
                {fileMeta_ ? (
                    <>
                        {`${fileMeta_.name} (${formatSize(fileMeta_.size)})`}{" "}
                        <Button type="link" onClick={() => setFileMeta_(null)}>
                            {OVERWRITE_TEXT}
                        </Button>
                    </>
                ) : (
                    [uploadText, dragAndDropText].filter(Boolean).join(" ")
                )}
            </p>
            {helpText ? <p className="ant-upload-hint">{helpText}</p> : ""}
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
            height={height}
            disabled={progressText !== null}
            accept={accept}
        >
            <p className="ant-upload-drag-icon">
                <InboxOutlined />
            </p>
            {progressText !== null ? <ProgressText /> : <InputText />}
        </Dragger>
    );
}

FileUploader.propTypes = FileUploaderType;
