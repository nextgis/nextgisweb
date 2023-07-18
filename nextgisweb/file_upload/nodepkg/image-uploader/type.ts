import { FileUploaderProps } from "../file-uploader/type";

export interface ImageUploaderProps extends FileUploaderProps {
    /** @deprecated */
    image?: FileUploaderProps["file"];
}
