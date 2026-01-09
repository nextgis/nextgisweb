import type { Upload } from "@nextgisweb/gui/antd";

export type UploadProps = Parameters<typeof Upload>[0];

export interface FileMeta {
    name: string;
    id: string;
    mime_type: string;
    size: number;
    _file?: File;
}

export type UploaderMeta<M extends boolean = boolean> = M extends true
    ? FileMeta[]
    : FileMeta;

export type AfterFileUploadOperation = {
    message: string;
    loader: (
        uploadedFiles: FileMeta[],
        options: { signal: AbortSignal }
    ) => Promise<void>;
};

export interface UseFileUploaderProps<
    M extends boolean = boolean,
    F extends UploaderMeta<M> = UploaderMeta<M>,
> {
    /** File types that can be accepted. See input accept {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept Attribute}  */
    accept?: string;
    fileMeta?: F;
    multiple?: M;
    inputProps?: UploadProps;
    setFileMeta?: (meta?: F) => void;
    showUploadList?: boolean;
    openFileDialogOnClick?: boolean;
    showProgressInDocTitle?: boolean;
    afterUpload?: AfterFileUploadOperation[];
    maxSize?: number;
    onChange?: (meta?: F) => void;
    onError?: (err: string) => void;
}

export interface FileUploaderProps<
    M extends boolean = boolean,
> extends UseFileUploaderProps<M> {
    helpText?: string;
    uploadText?: string;
    dragAndDropText?: string;
    height?: number;
    onUploading?: (status: boolean) => void;
    showMaxSize?: boolean;
    file?: File;
    reset?: boolean;
    style?: React.CSSProperties;
}

export interface Progress {
    type: "progress";
    decimal: number;
    percent: string;
}

export interface FileUploaderOptions {
    files: File[];
    onProgress?: (val: Progress) => void;
    signal?: AbortSignal;
}
