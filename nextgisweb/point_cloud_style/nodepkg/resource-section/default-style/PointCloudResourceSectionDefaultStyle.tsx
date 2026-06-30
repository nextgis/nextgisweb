import { useMemo } from "react";

import { errorModal } from "@nextgisweb/gui/error";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSectionButton } from "@nextgisweb/resource/resource-section";
import type {
  ResourceSection,
  ResourceSectionProps,
} from "@nextgisweb/resource/resource-section";
import type { CompositeCreate } from "@nextgisweb/resource/type/api";

const [msgButton, msgText] = [
  gettext("Create default point cloud style"),
  gettext(
    "Layer created. You can generate a default point cloud style resource using the button."
  ),
];

interface PointCloudResourceSectionDefaultStyleProps extends ResourceSectionProps {
  payload: CompositeCreate;
}

export const PointCloudResourceSectionDefaultStyle: ResourceSection<
  PointCloudResourceSectionDefaultStyleProps
> = ({ payload }) => {
  const create = useMemo(
    () => async () => {
      try {
        const { id } = await route("resource.collection").post({
          json: payload,
        });
        window.open(routeURL("resource.show", { id }), "_self");
      } catch (err) {
        errorModal(err);
      }
    },
    [payload]
  );

  return (
    <ResourceSectionButton type="primary" label={msgButton} onClick={create}>
      {msgText}
    </ResourceSectionButton>
  );
};

PointCloudResourceSectionDefaultStyle.displayName =
  "PointCloudResourceSectionDefaultStyle";
