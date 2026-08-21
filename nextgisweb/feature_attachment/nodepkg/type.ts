export interface PanoramaMarker {
  target: string;
  yaw: number;
  pitch: number;
}

interface Panorama {
  ProjectionType: string;
  id?: string;
  markers?: PanoramaMarker[];
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
