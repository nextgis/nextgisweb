// import { ContentCard } from "@nextgisweb/gui/component";
import { DescriptionHtml } from "@nextgisweb/gui/description";
import { assert } from "@nextgisweb/jsrealm/error";

import type { ResourceSection } from "../type";

export const ResourceSectionDescription: ResourceSection = ({
    resourceData,
}) => {
    const description = resourceData.resource.description;
    assert(description);

    const handleOnLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        const href = e?.currentTarget.getAttribute("href");
        e?.currentTarget.setAttribute("target", "_blank");

        if (href && /^\d+:\d+$/.test(href)) {
            e.preventDefault();
            e.stopPropagation();
            return true;
        }
        return false;
    };

    return (
        <DescriptionHtml
            content={description}
            onLinkClick={handleOnLinkClick}
        />
    );
};

ResourceSectionDescription.displayName = "ResourceSectionDescription";
