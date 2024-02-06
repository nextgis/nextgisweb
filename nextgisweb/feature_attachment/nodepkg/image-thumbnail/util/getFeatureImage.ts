import { routeURL } from "@nextgisweb/pyramid/api";

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
    const imageUrl = routeURL("feature_attachment.image", {
        id: resourceId,
        fid: featureId,
        aid: attachment.id,
    });

    let projection: string | null = null;
    if ("file_meta" in attachment) {
        try {
            projection = attachment.file_meta.panorama.ProjectionType;
        } catch (error) {
            // pass
        }
    }

    const sizeRequest = width && height ? `?size=${width}x${height}` : "";
    const url = imageUrl + sizeRequest;

    const isPanorama = projection === "equirectangular";

    return { url, isPanorama };
}
