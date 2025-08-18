import { route } from "@nextgisweb/pyramid/api";

import type { FeatureAttachment } from "../../type";

interface GetFeatureImageProps {
    resourceId: number;
    featureId: number;
    attachment: FeatureAttachment;
    height?: number;
    width?: number;
}

export function getFeatureImage({
    resourceId,
    featureId,
    attachment,
    height,
    width,
}: GetFeatureImageProps) {
    const query =
        width && height
            ? { size: `${width}x${height}`, crop: true }
            : undefined;

    const url = route("feature_attachment.image", {
        id: resourceId,
        fid: featureId,
        aid: attachment.id,
    }).url({ query });

    let projection: string | null = null;
    if ("file_meta" in attachment) {
        try {
            projection = attachment.file_meta.panorama.ProjectionType;
        } catch {
            // pass
        }
    }

    const isPanorama = projection === "equirectangular";
    const fileName = attachment.name;
    const description = attachment.description;

    return { url, isPanorama, fileName, description };
}
