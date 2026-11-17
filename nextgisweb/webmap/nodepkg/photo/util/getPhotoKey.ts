import type { Photo } from "../PhotoLayerStore";

export function getPhotoKey(photo: Photo) {
  return `${photo.featureId}:${photo.attachment.id}`;
}
