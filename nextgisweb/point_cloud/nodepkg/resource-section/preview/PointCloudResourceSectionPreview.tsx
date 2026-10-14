import { Suspense, lazy } from "react";

import { CentralLoading } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceSection } from "@nextgisweb/resource/resource-section";

import "./PointCloudPreview.less";

// Giro3D and three.js are heavy, so they are loaded in separate chunks only
// when the preview is rendered
const PointCloudPreviewLazy = lazy(() => import("./PointCloudPreview"));

export const PointCloudResourceSectionPreview: ResourceSection = ({
  resourceId,
  resourceData,
}) => {
  const data = resourceData.point_cloud_layer;
  if (!data) return null;

  return (
    <Suspense
      fallback={
        <div className="ngw-point-cloud-preview-canvas">
          <CentralLoading />
        </div>
      }
    >
      <PointCloudPreviewLazy resourceId={resourceId} data={data} />
    </Suspense>
  );
};

PointCloudResourceSectionPreview.displayName =
  "PointCloudResourceSectionPreview";
PointCloudResourceSectionPreview.title = gettext("Preview");
