import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";

export function isFeatureAttachment(file: unknown): file is FeatureAttachment {
    return (file as FeatureAttachment).file_meta !== undefined;
}
