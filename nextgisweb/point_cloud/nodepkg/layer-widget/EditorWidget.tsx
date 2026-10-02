import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo } from "react";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { Alert, Button, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";
import { SrsSelect } from "@nextgisweb/spatial-ref-sys/srs-select/SrsSelect";

import type { EditorStore, Inspection } from "./EditorStore";

// prettier-ignore
const [msgSelectDataset, msgSupportedFormats, msgInspect, msgPoints, msgPointFormat, msgSrs, msgFileCrs, msgHeights, msgNoCrs, msgNotRegistered, msgAddToWebGIS, msgCheckAgain] = [
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
  gettext("Add to Web GIS"),
  gettext("Check again"),
];

function formatCrs(name: string, auth: string | null) {
  return auth ? `${name} (${auth})` : name;
}

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
    const inspect = useCallback(
      async (fileMeta: FileMeta, signal?: AbortSignal) => {
        store.setInspecting(true);
        try {
          const inspection = await route("point_cloud.inspect").post({
            json: { id: fileMeta.id },
            signal,
          });
          store.setInspection(fileMeta.id, inspection);
        } catch (err) {
          if (!isAbortError(err)) {
            errorModal(err);
          }
          store.setSource(null);
          throw err;
        } finally {
          store.setInspecting(false);
        }
      },
      [store]
    );

    const inspectUpload = useCallback(
      async (value: FileMeta[], { signal }: { signal: AbortSignal }) => {
        if (value[0]) await inspect(value[0], signal);
      },
      [inspect]
    );

    // Inspect the stored file to show its coordinate system on update
    const { makeSignal } = useAbortController();
    const { resourceId } = store.composite;
    useEffect(() => {
      if (resourceId === null) return;
      route("point_cloud.layer_inspect", resourceId)
        .get({ signal: makeSignal() })
        .then(store.setStoredInspection)
        .catch((err) => {
          if (!isAbortError(err)) errorModal(err);
        });
    }, [resourceId, store, makeSignal]);

    const { source } = store;
    const inspection = store.currentInspection;
    const crs = inspection?.crs;

    // Only coordinate systems equivalent to the file one can be selected,
    // as the point cloud is not reprojected
    const candidateOptions = useMemo<OptionType[] | undefined>(() => {
      if (!inspection || !crs) return undefined;
      if (inspection.srs_candidates.length) {
        return inspection.srs_candidates.map((srs) => ({
          value: srs.id,
          label: srs.display_name,
        }));
      }
      return [
        {
          value: undefined,
          disabled: true,
          label: (
            <span>
              {formatCrs(crs.display_name, crs.auth)}{" "}
              {crs.auth && (
                <a
                  href={
                    routeURL("srs.catalog") +
                    "?q=" +
                    encodeURIComponent(crs.auth)
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {msgAddToWebGIS}
                </a>
              )}
            </span>
          ),
        },
      ];
    }, [inspection, crs]);

    const showSrs = !!inspection;
    const notRegistered =
      !!candidateOptions && !inspection?.srs_candidates.length;

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
            {candidateOptions ? (
              <Select<number>
                style={{ width: "100%" }}
                value={store.srsId ?? undefined}
                options={candidateOptions}
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
            <Alert
              type="warning"
              showIcon
              title={msgNotRegistered}
              action={
                <Button
                  size="small"
                  loading={store.inspecting}
                  onClick={() => inspect(source).catch(() => {})}
                >
                  {msgCheckAgain}
                </Button>
              }
            />
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
