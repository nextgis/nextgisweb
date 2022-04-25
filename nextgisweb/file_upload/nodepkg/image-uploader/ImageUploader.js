import "./ImageUploader.less";

import { InboxOutlined, StopOutlined } from "@ant-design/icons";
import { useFileUploader } from "../hook/useFileUploader";
import { message, Upload, Button } from "@nextgisweb/gui/antd";
import { DeleteOutlined } from "@ant-design/icons";
import i18n from "@nextgisweb/pyramid/i18n!file_upload";
import { PropTypes } from "prop-types";
import { useState, useEffect } from "react";

const { Dragger } = Upload;

const UPLOAD_TEXT = `${i18n.gettext("Select an image")}`;
const DND_TEXT = i18n.gettext("or drag and drop here");

export function ImageUploader({
    helpText,
    uploadText = UPLOAD_TEXT,
    dragAndDropText = DND_TEXT,
    onChange,
    showProgressInDocTitle = true,
    accept,
    image,
    inputProps = {},
}) {
    const [fileUploader, abortFileUpload] = useFileUploader();
    const [progressText, setProgressText] = useState(null);
    const [imageMeta, setImageMeta] = useState(null);
    const [docTitle] = useState(document.title);
    const [backgroundImage, setBackgroundImage] = useState(null);

    useEffect(() => {
        if (image) {
            readImage(image);
        }
    }, []);

    useEffect(() => {
        if (onChange) {
            onChange(imageMeta);
        }
    }, [imageMeta]);

    const readImage = (file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setBackgroundImage(`url(${reader.result})`);
        };
        reader.readAsDataURL(file);
    };

    const abort = () => {
        abortFileUpload();
    };

    const clean = () => {
        setImageMeta(null);
        setBackgroundImage(null);
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
            const uploadedImages = await fileUploader({
                files,
                onProgress,
            });
            const uploadedImage = uploadedImages && uploadedImages[0];
            if (uploadedImage) {
                setImageMeta(uploadedImage);
                readImage(files[0]);
            }
        } catch (er) {
            console.log(er);
        } finally {
            setProgressText(null);
        }
    };

    const props = {
        name: "image",
        multiple: false,
        showUploadList: false,
        onChange(info) {
            const { status } = info.file;
            if (status === "done") {
                upload([info.file.originFileObj]);
            } else if (status === "error") {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
    };

    const height = "220px";

    const DragInput = () => {
        const InputText = () => (
            <>
                <p className="ant-upload-text">
                    {[uploadText, dragAndDropText].filter(Boolean).join(" ")}
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
                    <Button
                        shape="round"
                        icon={<StopOutlined />}
                        onClick={abort}
                    >
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
                {...inputProps}
            >
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                {progressText !== null ? <ProgressText /> : <InputText />}
            </Dragger>
        );
    };

    const Preview = () => {
        return (
            <div className="uploader--image uploader--complete">
                <div
                    className="uploader__dropzone"
                    style={{
                        height: height,
                        backgroundImage: backgroundImage,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    <Button
                        shape="round"
                        ghost
                        danger
                        icon={<DeleteOutlined />}
                        style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                        }}
                        onClick={() => clean()}
                    >
                        {i18n.gettext("Delete")}
                    </Button>
                </div>
            </div>
        );
    };

    return <>{backgroundImage ? <Preview /> : DragInput()}</>;
}

ImageUploader.propTypes = {
    helpText: PropTypes.string,
    uploadText: PropTypes.string,
    dragAndDropText: PropTypes.string,
    showProgressInDocTitle: PropTypes.bool,
    onChange: PropTypes.func,
    image: PropTypes.object,
    inputProps: PropTypes.object,
    accept: PropTypes.string,
};
