import type { UploadFile } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FileUploader } from "../file-uploader";
import type {
    FileUploaderProps,
    UploadProps,
    UploaderMeta,
} from "../file-uploader/type";

import "./ImageUploader.less";

type OriginFileObj = UploadFile["originFileObj"];

const msgUpload = gettext("Select a file");
const msgClear = gettext("Clear");

const height = 220;

export interface ImageUploaderProps extends FileUploaderProps<false> {
    image?: Blob | string | null;
    onClear?: () => void;
}

export function ImageUploader({
    inputProps: inputPropsParam,
    file,
    image,
    onClear,
    ...rest
}: ImageUploaderProps) {
    const [imageSrc, setImageSrc] = useState<string>();
    const [chosenFile, setChosenFile] = useState<OriginFileObj[]>();
    const [fileMeta, setFileMeta] = useState<UploaderMeta<false>>();

    const inputPropsOnChange = inputPropsParam?.onChange;

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

    const clear = useCallback(() => {
        setFileMeta(undefined);
        setImageSrc(undefined);
        onClear?.();
    }, [onClear]);

    const readImage = (value: Blob | Blob[]) => {
        const first = Array.isArray(value) ? value[0] : value;
        const blobUrl = URL.createObjectURL(first);
        setImageSrc(`${blobUrl}`);
    };

    useEffect(() => {
        if (image instanceof Blob) {
            readImage(image);
        } else if (image) {
            setImageSrc(image);
        }
    }, [image]);

    useEffect(() => {
        if (chosenFile && fileMeta) {
            readImage(chosenFile as File[]);
        }
    }, [chosenFile, fileMeta]);

    return (
        <>
            {imageSrc ? (
                <div
                    className="ngw-file-upload-image-uploader completed"
                    style={{ height }}
                >
                    <img src={imageSrc} />
                    <Button
                        className="clear-button"
                        size="small"
                        variant="filled"
                        icon={<RemoveIcon />}
                        onClick={() => clear()}
                    >
                        {msgClear}
                    </Button>
                </div>
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
