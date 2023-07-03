import CancelIcon from "@material-icons/svg/cancel";

import { InboxOutlined } from "@ant-design/icons";
import { Button, Upload } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";
import { formatSize } from "@nextgisweb/gui/util/formatSize";

import { useFileUploader } from "../hook/useFileUploader";
import { FileUploaderType } from "../type/FileUploaderType";

const { Dragger } = Upload;

const UPLOAD_TEXT = i18n.gettext("Select a file");
const DND_TEXT = i18n.gettext("or drag and drop here");
const OVERWRITE_TEXT = i18n.gettext("Overwrite?");

export function FileUploader({
    helpText,
    uploadText = UPLOAD_TEXT,
    dragAndDropText = DND_TEXT,
    onChange,
    showProgressInDocTitle = true,
    height = "220px",
    accept,
    inputProps = {},
    fileMeta,
    setFileMeta,
}) {
    const { abort, progressText, props, meta, setMeta } = useFileUploader({
        showProgressInDocTitle,
        setFileMeta,
        inputProps,
        fileMeta: fileMeta,
        onChange,
        accept,
    });

    const InputText = () => (
        <>
            <p className="ant-upload-text">
                {meta ? (
                    <>
                        {`${meta.name} (${formatSize(meta.size)})`}{" "}
                        <Button
                            type="link"
                            onClick={() => {
                                setMeta(null);
                            }}
                        >
                            {OVERWRITE_TEXT}
                        </Button>
                    </>
                ) : (
                    [uploadText, dragAndDropText].filter(Boolean).join(" ")
                )}
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
                <Button shape="round" icon={<CancelIcon />} onClick={abort}>
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
        >
            <p className="ant-upload-drag-icon">
                <InboxOutlined />
            </p>
            {progressText !== null ? <ProgressText /> : <InputText />}
        </Dragger>
    );
}

FileUploader.propTypes = FileUploaderType;
