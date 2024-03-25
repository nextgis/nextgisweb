interface Panorama {
    ProjectionType: string;
}

interface FeatureAttachmentFileMeta {
    panorama: Panorama;
}
export interface FeatureAttachment {
    id: number;
    name: string;
    size: number;
    mime_type: string;
    is_image: boolean;
    file_meta: FeatureAttachmentFileMeta;
    keyname?: string;
    description?: string;
}
