import { InboxOutlined } from "@ant-design/icons";
import { Upload, Button } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";

import { useFileUploader } from "../hook/useFileUploader";
import { FileUploaderType } from "../type/FileUploaderType";

const UPLOAD_TEXT = i18n.gettext("Upload");

export function FileUploaderButton({
    showProgressInDocTitle,
    setFileMeta,
    uploadText = UPLOAD_TEXT,
    inputProps,
    onChange,
    fileMeta,
    multiple,
    accept,
}) {
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

FileUploaderButton.propTypes = FileUploaderType;
