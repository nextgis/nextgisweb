import { ContentCard } from "@nextgisweb/gui/component";
import { assert } from "@nextgisweb/jsrealm/error";

import type { ResourceSection } from "../type";

export const ResourceSectionDescription: ResourceSection = ({
    resourceData,
}) => {
    const description = resourceData.resource.description;
    assert(description);

    return <ContentCard dangerouslySetInnerHTML={{ __html: description }} />;
};

ResourceSectionDescription.displayName = "ResourceSectionDescription";
