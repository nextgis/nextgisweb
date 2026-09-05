import type { Attachment } from "@nextgisweb/feature-attachment/attachment-editor/type";
import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";

export function isPanoramaFeatureAttachment(
  attachment: Attachment
): attachment is Attachment & FeatureAttachment {
  return attachment.isPanorama;
}
