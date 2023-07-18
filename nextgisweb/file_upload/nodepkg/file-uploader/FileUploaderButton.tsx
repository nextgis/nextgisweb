import { InboxOutlined } from "@ant-design/icons";
import { Button, Upload } from "@nextgisweb/gui/antd";

import { useFileUploader } from "./hook/useFileUploader";
import type { FileUploaderProps } from "./type";

import i18n from "@nextgisweb/pyramid/i18n";

const mUploadButton = i18n.gettext("Upload");

export function FileUploaderButton({
    showProgressInDocTitle,
    setFileMeta,
    uploadText = mUploadButton,
    inputProps,
    onChange,
    fileMeta,
    multiple,
    accept,
}: FileUploaderProps) {
    const { uploading, props } = useFileUploader({
        showProgressInDocTitle,
        setFileMeta,
        inputProps,
        fileMeta,
        onChange,
        multiple,
        accept,
    });

    return (
        <Upload {...props}>
            <Button icon={<InboxOutlined />} loading={uploading}>
                {uploadText}
            </Button>
        </Upload>
    );
}
