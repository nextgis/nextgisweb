import type {
    DataSource,
    FileMetaToUpload,
} from "@nextgisweb/feature-attachment/attachment-editor/type";
import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";

import { getFeatureImage } from "./getFeatureImage";
import { getFileImage } from "./getFileImage";
import { isFeatureAttachment } from "./isFeatureAttachment";

export async function getImageURL({
    source,
    featureId,
    resourceId,
    width,
    height,
}: {
    source: DataSource;
    featureId?: number | null;
    resourceId?: number;
    width?: number;
    height?: number;
}) {
    if (!isFeatureAttachment(source)) {
        const newAttachment = source as FileMetaToUpload;
        const file = newAttachment._file as File;
        const url = await getFileImage(file);
        return url;
    } else if (
        typeof featureId === "number" &&
        typeof resourceId === "number"
    ) {
        const attachment_ = source as FeatureAttachment;
        const { url } = getFeatureImage({
            featureId,
            resourceId,
            attachment: attachment_,
            height,
            width,
        });
        return url;
    }
}
