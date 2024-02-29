import type { UploadFile } from "antd";
import { useEffect, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FileUploader } from "../file-uploader";
import type { FileUploaderProps, UploaderMeta } from "../file-uploader/type";

import type { ImageUploaderProps } from "./type";

import DeleteIcon from "@nextgisweb/icon/material/delete";

import "./ImageUploader.less";

type OriginFileObj = UploadFile["originFileObj"];

const msgUpload = gettext("Select a file");
const msgDelete = gettext("Delete");

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

    const height = 220;
    const props: FileUploaderProps = {
        file,
        height,
        fileMeta,
        uploadText: msgUpload,
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
        setFileMeta(undefined);
        setBackgroundImage(undefined);
    };

    const readImage = (image_: File | Blob | (File | Blob)[]) => {
        const f = Array.isArray(image_) ? image_[0] : image_;
        const reader = new FileReader();
        reader.onloadend = () => {
            setBackgroundImage(`url(${reader.result}`);
        };
        reader.readAsDataURL(f);
    };

    useEffect(() => {
        if (image) {
            setBackgroundImage(`url(${image})`);
        }
    }, [image]);

    useEffect(() => {
        if (chosenFile && fileMeta) {
            readImage(chosenFile as File[]);
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
                        {msgDelete}
                    </Button>
                </div>
            </div>
        );
    };

    return <>{backgroundImage ? <Preview /> : <FileUploader {...props} />}</>;
}
