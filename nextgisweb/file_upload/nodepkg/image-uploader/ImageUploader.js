import "./ImageUploader.less";

import { PropTypes } from "prop-types";

import { useState, useEffect } from "react";

import DeleteIcon from "@material-icons/svg/delete";
import { Button } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";

import { FileUploader } from "../file-uploader";
import { FileUploaderType } from "../type/FileUploaderType";

const UPLOAD_TEXT = `${i18n.gettext("Select an image")}`;

export function ImageUploader({ inputProps, file, image, ...rest }) {
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [chosenFile, setChosenFile] = useState();
    const [fileMeta, setFileMeta] = useState();

    const inputPropsOnChange = inputProps?.onChange;

    // for backward compatibility
    file = file ?? image;
    const props = {
        file,
        height: "220px",
        fileMeta,
        uploadText: UPLOAD_TEXT,
        setFileMeta,
        inputProps: {
            name: "image",
            onChange: (info) => {
                if (info) {
                    const { status } = info.file;
                    if (status === "done") {
                        setChosenFile([info.file.originFileObj]);
                    }
                    if (inputPropsOnChange) {
                        inputPropsOnChange(info);
                    }
                }
            },
            ...inputProps,
        },
        ...rest,
    };

    const clean = () => {
        setFileMeta(null);
        setBackgroundImage(null);
    };

    const readImage = (file_) => {
        const f = Array.isArray(file_) ? file_[0] : file_
        const reader = new FileReader();
        reader.onloadend = () => {
            setBackgroundImage(`url(${reader.result})`);
        };
        reader.readAsDataURL(f);
    };

    useEffect(() => {
        if (file) {
            readImage(file);
        }
    }, [file]);

    useEffect(() => {
        if (chosenFile && fileMeta) {
            readImage(chosenFile);
        }
    }, [chosenFile, fileMeta]);

    const Preview = () => {
        return (
            <div className="uploader--image uploader--complete">
                <div
                    className="uploader__dropzone"
                    style={{
                        height: props.height,
                        backgroundImage: backgroundImage,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    <Button
                        shape="round"
                        ghost
                        danger
                        icon={<DeleteIcon />}
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

    return <>{backgroundImage ? <Preview /> : <FileUploader {...props} />}</>;
}

ImageUploader.propTypes = {
    /**
     * @deprecated - use file instead
     */
    image: PropTypes.object,
    file: PropTypes.object,
    height: PropTypes.string,
    ...FileUploaderType,
};
