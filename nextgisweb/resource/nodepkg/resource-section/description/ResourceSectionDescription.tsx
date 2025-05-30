// import { ContentCard } from "@nextgisweb/gui/component";
import { DescriptionHtml } from "@nextgisweb/gui/description";
import { assert } from "@nextgisweb/jsrealm/error";

import type { ResourceSection } from "../type";

export const ResourceSectionDescription: ResourceSection = ({
    resourceData,
}) => {
    const description = resourceData.resource.description;
    assert(description);

    return <DescriptionHtml content={description} />;
};

ResourceSectionDescription.displayName = "ResourceSectionDescription";
