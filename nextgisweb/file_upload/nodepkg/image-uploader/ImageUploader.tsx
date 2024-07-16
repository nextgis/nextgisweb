import type { UploadFile } from "antd";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FileUploader } from "../file-uploader";
import type { UploadProps, UploaderMeta } from "../file-uploader/type";

import type { ImageUploaderProps } from "./type";

import "./ImageUploader.less";

type OriginFileObj = UploadFile["originFileObj"];

const msgUpload = gettext("Select a file");
const msgDelete = gettext("Delete");

export function ImageUploader<M extends boolean = boolean>({
    inputProps: inputPropsParam,
    onClean = () => {},
    file,
    image,
    ...rest
}: ImageUploaderProps<M>) {
    const [backgroundImage, setBackgroundImage] = useState<string>();
    const [chosenFile, setChosenFile] = useState<OriginFileObj[]>();
    const [fileMeta, setFileMeta] = useState<UploaderMeta<M>>();

    const inputPropsOnChange = inputPropsParam?.onChange;

    const height = 220;

    const inputProps = useMemo<UploadProps>(() => {
        return {
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
            ...inputPropsParam,
        };
    }, [inputPropsOnChange, inputPropsParam]);

    const clean = () => {
        setFileMeta(undefined);
        setBackgroundImage(undefined);
        onClean();
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
                        icon={<RemoveIcon />}
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

    return (
        <>
            {backgroundImage ? (
                <Preview />
            ) : (
                <FileUploader
                    file={file}
                    height={height}
                    fileMeta={fileMeta}
                    uploadText={msgUpload}
                    setFileMeta={setFileMeta}
                    inputProps={inputProps}
                    {...rest}
                />
            )}
        </>
    );
}
