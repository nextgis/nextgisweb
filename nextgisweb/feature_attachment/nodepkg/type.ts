export interface FeatureAttachment {
    id: number;
    name: string;
    keyname?: string;
    size: number;
    mime_type: string;
    description?: string;
    is_image: boolean;
}
