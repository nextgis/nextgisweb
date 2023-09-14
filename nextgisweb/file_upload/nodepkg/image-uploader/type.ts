import { FileUploaderProps } from "../file-uploader/type";

export interface ImageUploaderProps extends FileUploaderProps {
    image?: Blob | File | null;
}
