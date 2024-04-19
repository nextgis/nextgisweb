import { FileUploader } from "../FileUploader";
import type { FileUploaderProps, UploaderMeta } from "../type";

interface FileUploaderFieldProps extends FileUploaderProps {
    value?: UploaderMeta;
    onChange?: (val?: UploaderMeta) => void;
}

export function FilePicker({
    value,
    onChange,
    ...props
}: FileUploaderFieldProps) {
    return <FileUploader fileMeta={value} onChange={onChange} {...props} />;
}
