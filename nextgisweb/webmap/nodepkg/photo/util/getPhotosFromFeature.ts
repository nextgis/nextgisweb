import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";

import type { Photo } from "../PhotoLayerStore";

export function getPhotosFromFeature(feature: FeatureItem): Photo[] {
  const attachments = feature.extensions.attachment as
    | FeatureAttachment[]
    | null;
  if (!attachments) return [];
  return attachments
    .filter((attachment) => attachment.is_image)
    .map((attachment) => ({ featureId: feature.id, attachment }));
}
