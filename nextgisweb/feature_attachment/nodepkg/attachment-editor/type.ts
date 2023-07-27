import type { FeatureAttachment } from "../type";

export type WidgetValue = string | null;

interface Fileupload {
    id: string;
    size: number;
}

interface FileLocal {
    uid: string;
}

export interface FileMetaToUpload {
    _file?: FileLocal | File;
    name: string;
    size: number;
    mime_type: string;
    description: string;
    file_upload: Fileupload;
}

export type DataSource = FeatureAttachment | FileMetaToUpload;
