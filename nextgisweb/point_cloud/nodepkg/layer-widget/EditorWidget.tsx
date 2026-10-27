import { observer } from "mobx-react-lite";
import { useCallback, useEffect } from "react";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { Alert } from "@nextgisweb/gui/antd";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";
import { SrsSelect } from "@nextgisweb/spatial-ref-sys/srs-select/SrsSelect";
import { SrsSelectExpandable } from "@nextgisweb/spatial-ref-sys/srs-select-expandable";

import type { EditorStore, Inspection } from "./EditorStore";
import { useInspectionSrsItems } from "./useInspectionSrsItems";
import { formatCrs } from "./util";

// prettier-ignore
const [msgSelectDataset, msgSupportedFormats, msgInspect, msgPoints, msgPointFormat, msgSrs, msgFileCrs, msgHeights, msgNoCrs, msgNotRegistered] = [
  gettext("Select a dataset"),
  gettext("Cloud Optimized Point Cloud (COPC) files with point formats 6, 7, and 8 are supported."),
  gettext("Inspecting point cloud"),
  gettext("Points"),
  gettext("Point format"),
  gettext("Spatial reference system"),
  gettext("Coordinate system in the file"),
  gettext("Heights"),
  gettext("The file has no coordinate system info. Select it manually: a wrong choice will misplace the point cloud."),
  gettext("The coordinate system of the file is not registered in NextGIS Web."),
];

function InspectionSummary({ inspection }: { inspection: Inspection }) {
  const { crs } = inspection;
  return (
    <Alert
      type={crs ? "info" : "warning"}
      showIcon
      title={
        <>
          {crs ? (
            <>
              {msgFileCrs}: {formatCrs(crs.display_name, crs.auth)}
              {crs.vertical_display_name && (
                <>
                  <br />
                  {msgHeights}:{" "}
                  {formatCrs(crs.vertical_display_name, crs.vertical_auth)}
                </>
              )}
            </>
          ) : (
            msgNoCrs
          )}
          <br />
          {msgPoints}: {inspection.point_count}
          <br />
          {msgPointFormat}: {inspection.point_format_id}
        </>
      }
    />
  );
}

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const inspectUpload = useCallback(
      async (value: FileMeta[], { signal }: { signal: AbortSignal }) => {
        if (!value[0]) return;
        try {
          await store.inspectSource(value[0].id, signal);
        } catch (err) {
          if (!isAbortError(err)) {
            errorModal(err);
          }
          store.setSource(null);
          throw err;
        }
      },
      [store]
    );

    // Inspect the stored file to show its coordinate system on update
    const { makeSignal } = useAbortController();
    const { resourceId } = store.composite;
    useEffect(() => {
      if (resourceId === null) return;
      store.loadStoredInspection(makeSignal()).catch((err) => {
        if (!isAbortError(err)) errorModal(err);
      });
    }, [resourceId, store, makeSignal]);

    const { source } = store;
    const inspection = store.currentInspection;
    const crs = inspection?.crs;

    const { srsItems, refresh: refreshSrs } = useInspectionSrsItems(store);

    const showSrs = !!inspection;
    const notRegistered = !!crs && !inspection?.srs_candidates.length;

    return (
      <Area pad>
        <Lot label={false}>
          <FileUploader
            fileMeta={source ?? undefined}
            onChange={(meta) => store.setSource(meta ?? null)}
            onUploading={store.setUploading}
            multiple={false}
            accept=".laz"
            afterUpload={[{ message: msgInspect, loader: inspectUpload }]}
            uploadText={msgSelectDataset}
            helpText={msgSupportedFormats}
          />
        </Lot>
        {inspection && (
          <Lot label={false}>
            <InspectionSummary inspection={inspection} />
          </Lot>
        )}
        {showSrs && (
          <Lot label={msgSrs}>
            {srsItems ? (
              <SrsSelectExpandable
                style={{ width: "100%" }}
                value={store.srsId ?? undefined}
                items={srsItems}
                refresh={refreshSrs}
                onChange={(value) => store.setSrsId(value ?? null)}
              />
            ) : (
              <SrsSelect
                style={{ width: "100%" }}
                value={store.srsId ?? undefined}
                onChange={(value) => store.setSrsId(value ?? null)}
              />
            )}
          </Lot>
        )}
        {notRegistered && source && (
          <Lot label={false}>
            <Alert type="warning" showIcon title={msgNotRegistered} />
          </Lot>
        )}
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Point cloud layer");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
