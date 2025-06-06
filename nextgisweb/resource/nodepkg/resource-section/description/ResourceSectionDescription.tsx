import { FeatureDisplayModal } from "@nextgisweb/feature-layer/feature-display-modal";
import { DescriptionHtml } from "@nextgisweb/gui/description";
import showModal from "@nextgisweb/gui/showModal";
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
            const [resourceId, featureId] = href.split(":").map(Number);
            showModal(FeatureDisplayModal, {
                featureId,
                resourceId,
            });
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
