import type {
  Attachment,
  DataSource,
} from "@nextgisweb/feature-attachment/attachment-editor/type";
import type { PhotospherePreviewNode } from "@nextgisweb/feature-attachment/photosphere-preview";
import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";

export function isPanoramaAttachment(attachment: DataSource) {
  const projection =
    "file_meta" in attachment && attachment.file_meta?.panorama?.ProjectionType;
  return projection === "equirectangular";
}

export function isPanoramaFeatureAttachment(
  attachment: Attachment
): attachment is Attachment & FeatureAttachment {
  return attachment.isPanorama;
}

export function panoramaNodeId(
  attachment: Attachment & FeatureAttachment
): string | undefined {
  return attachment.file_meta.panorama.id;
}

export function isLinkedTransition(
  tourNodes: PhotospherePreviewNode[],
  fromNodeId: string | null,
  toNodeId: string
): boolean {
  if (fromNodeId === toNodeId) return true;
  const fromNode = tourNodes.find((node) => node.id === fromNodeId);
  return !!fromNode?.markers?.some((point) => point.target === toNodeId);
}
