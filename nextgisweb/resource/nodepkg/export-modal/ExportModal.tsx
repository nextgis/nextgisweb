import { Suspense, lazy } from "react";
import type { ReactNode } from "react";

import type { ExportFeatureLayerOptions } from "@nextgisweb/feature-layer/hook/useExportFeatureLayer";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { ExtentRowValue } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ResourceActionModal } from "../component/ResourceActionModal";

const FeatureExportForm = lazy(
  () => import("@nextgisweb/feature-layer/export-form")
);
const RasterExportForm = lazy(
  () => import("@nextgisweb/raster-layer/export-form")
);

export interface ExportModalProps extends ShowModalOptions {
  resourceId: number;
  exportType?: "feature_layer" | "raster_layer";
  params?: ExportFeatureLayerOptions;
  renderExtentButton?: (onDone: (extent: ExtentRowValue) => void) => ReactNode;
}

export function ExportModal({
  resourceId,
  exportType = "feature_layer",
  params = {},
  renderExtentButton,
  ...modalProps
}: ExportModalProps) {
  const searchParams = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
  const query = searchParams.toString();
  const url = routeURL("resource.export.page", resourceId);

  return (
    <ResourceActionModal
      centered={false}
      {...modalProps}
      title={gettext("Export")}
      href={query ? `${url}?${query}` : url}
      width={1200}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      destroyOnHidden
      closable={false}
      footer={null}
    >
      <Suspense fallback={<LoadingWrapper />}>
        {exportType === "raster_layer" ? (
          <RasterExportForm id={resourceId} />
        ) : (
          <FeatureExportForm
            id={resourceId}
            params={params}
            renderExtentButton={renderExtentButton}
          />
        )}
      </Suspense>
    </ResourceActionModal>
  );
}
