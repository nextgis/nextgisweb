import { useState, useEffect } from "react";

import DeleteIcon from "@material-icons/svg/delete";
import { Button } from "@nextgisweb/gui/antd";
import type { UploadFile } from "antd";

import { FileUploader } from "../file-uploader";
import type { FileUploaderProps, UploaderMeta } from "../file-uploader/type";
import type { ImageUploaderProps } from "./type";

import i18n from "@nextgisweb/pyramid/i18n";

import "./ImageUploader.less";

type OriginFileObj = UploadFile["originFileObj"];

const mUpload = i18n.gettext("Select a file");
const mDelete = i18n.gettext("Delete");

export function ImageUploader({
    inputProps,
    file,
    image,
    ...rest
}: ImageUploaderProps) {
    const [backgroundImage, setBackgroundImage] = useState<string>();
    const [chosenFile, setChosenFile] = useState<OriginFileObj[]>();
    const [fileMeta, setFileMeta] = useState<UploaderMeta>();

    const inputPropsOnChange = inputProps?.onChange;

    // for backward compatibility
    file = file ?? image;
    const height = 220;
    const props: FileUploaderProps = {
        file,
        height,
        fileMeta,
        uploadText: mUpload,
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

    const readImage = (file_: File | File[]) => {
        const f = Array.isArray(file_) ? file_[0] : file_;
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
                        height: height + "px",
                        backgroundImage,
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
                        {mDelete}
                    </Button>
                </div>
            </div>
        );
    };

    return <>{backgroundImage ? <Preview /> : <FileUploader {...props} />}</>;
}
