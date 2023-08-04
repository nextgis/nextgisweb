import type { Upload } from "@nextgisweb/gui/antd";

export type UploadProps = Parameters<typeof Upload>[0];

export interface FileMeta {
    name: string;
    id: string;
    mime_type: string;
    size: number;
    _file?: File;
}

export type UploaderMeta = FileMeta | FileMeta[];

export interface UseFileUploaderProps {
    /** File types that can be accepted. See input accept {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept Attribute}  */
    accept?: string;
    fileMeta?: UploaderMeta;
    multiple?: boolean;
    onChange?: (meta?: UploaderMeta) => void;
    inputProps?: UploadProps;
    setFileMeta?: (meta?: UploaderMeta) => void;
    showUploadList?: boolean;
    openFileDialogOnClick?: boolean;
    showProgressInDocTitle?: boolean;
}

export interface FileUploaderProps extends UseFileUploaderProps {
    helpText?: string;
    uploadText?: string;
    dragAndDropText?: string;
    height?: number;
    onUploading?: (status: boolean) => void;
    showMaxSize?: boolean;
    file?: File;
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
