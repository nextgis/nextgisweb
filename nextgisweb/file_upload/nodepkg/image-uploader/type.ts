import type { FileUploaderProps } from "../file-uploader/type";

export interface ImageUploaderProps<M extends boolean = boolean>
    extends FileUploaderProps<M> {
    image?: Blob | File | string | null;
}
