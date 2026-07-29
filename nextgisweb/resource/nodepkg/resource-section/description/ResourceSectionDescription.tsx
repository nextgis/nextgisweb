import { lazy } from "react";
import type { MouseEvent } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { DescriptionHtml } from "@nextgisweb/gui/description";
import { assert } from "@nextgisweb/jsrealm/error";

import type { ResourceSection } from "../type";

const FeatureDisplayModalLazy = lazy(
  () => import("@nextgisweb/feature-layer/feature-display-modal")
);

export const ResourceSectionDescription: ResourceSection = ({
  resourceData,
}) => {
  const description = resourceData.resource.description;
  const { showModal, modalHolder } = useShowModal();
  assert(description);

  const handleOnLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const href = e?.currentTarget.getAttribute("href");
    e?.currentTarget.setAttribute("target", "_blank");

    if (href && /^\d+:\d+$/.test(href)) {
      e.preventDefault();
      e.stopPropagation();
      const [resourceId, featureId] = href.split(":").map(Number);
      showModal(FeatureDisplayModalLazy, {
        featureId,
        resourceId,
      });
      return true;
    }
    return false;
  };

  return (
    <>
      {modalHolder}
      <DescriptionHtml content={description} onLinkClick={handleOnLinkClick} />
    </>
  );
};

ResourceSectionDescription.displayName = "ResourceSectionDescription";
