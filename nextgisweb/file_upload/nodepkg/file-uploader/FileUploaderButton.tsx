import { Button, Upload, message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { useFileUploader } from "./hook/useFileUploader";
import type { FileUploaderProps } from "./type";

import { InboxOutlined } from "@ant-design/icons";

const msgUploadButton = gettext("Upload");

export function FileUploaderButton<M extends boolean = false>({
    showProgressInDocTitle,
    showUploadList,
    setFileMeta,
    uploadText = msgUploadButton,
    afterUpload,
    inputProps,
    onChange,
    fileMeta,
    multiple = false as M,
    accept,
}: FileUploaderProps<M>) {
    const [messageApi, contextHolder] = message.useMessage();

    const { uploading, props } = useFileUploader({
        showProgressInDocTitle,
        showUploadList,
        afterUpload,
        setFileMeta,
        inputProps,
        fileMeta,
        onChange,
        multiple,
        onError: messageApi.error,
        accept,
    });

    return (
        <>
            {contextHolder}
            <Upload {...props}>
                <Button icon={<InboxOutlined />} loading={uploading}>
                    {uploadText}
                </Button>
            </Upload>
        </>
    );
}
