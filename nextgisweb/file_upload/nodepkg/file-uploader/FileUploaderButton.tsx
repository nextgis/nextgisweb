import { Button, Upload } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { useFileUploader } from "./hook/useFileUploader";
import type { FileUploaderProps } from "./type";

import { InboxOutlined } from "@ant-design/icons";

const msgUploadButton = gettext("Upload");

export function FileUploaderButton({
    showProgressInDocTitle,
    setFileMeta,
    uploadText = msgUploadButton,
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
